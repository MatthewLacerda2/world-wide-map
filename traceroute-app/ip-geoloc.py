import json
import math
import requests
from typing import Dict, Optional

# Speed of light in meters per second
SPEED_OF_LIGHT = 299792458  # m/s

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth using Haversine formula.
    Returns distance in meters.
    """
    # Convert latitude and longitude from degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth's radius in meters
    earth_radius = 6371000  # meters
    
    distance = earth_radius * c
    return distance

def calculate_minimum_ping_time(distance_meters: float) -> float:
    """
    Calculate minimum expected ping time based on distance.
    Uses speed of light * 3 (accounting for routing overhead).
    Returns time in milliseconds.
    """
    # Minimum time = (distance * 3) / speed_of_light
    # Multiply by 1000 to convert seconds to milliseconds
    min_time_ms = (distance_meters * 3) / SPEED_OF_LIGHT * 1000
    return min_time_ms

def clamp_ping_time(ping_time: Optional[int], min_ping_time: float) -> Optional[int]:
    """
    Clamp ping time to be at least the minimum expected time.
    Returns None if ping_time is None, otherwise returns clamped value.
    """
    if ping_time is None:
        return None
    
    # Round up to nearest integer
    min_ping_int = math.ceil(min_ping_time)
    
    return max(ping_time, min_ping_int)

def get_geo_info(ip: str) -> Optional[Dict[str, any]]:
    """Fetch geolocation information for an IP address."""
    try:
        response = requests.get(f"https://ipwhois.app/json/{ip}")
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success", False):
            return None
        
        return {
            "country": data.get("country", ""),
            "region": data.get("region", ""),
            "city": data.get("city", ""),
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude")
        }
    except Exception as e:
        print(f"Error fetching geolocation for {ip}: {e}")
        return None

def process_results():
    """Read results.json, add geolocation data, and save back incrementally."""
    # Read the results file
    with open("results.json", "r", encoding="utf-8") as f:
        results = json.load(f)
    
    # First pass: Build cache from existing geolocation data in the file
    ip_cache = {}
    print("Scanning existing entries for geolocation data...")
    for entry in results:
        # Check if origin IP already has geolocation data
        if entry.get("origin") != "unknown" and "origin_geo" in entry and entry["origin_geo"]:
            origin_ip = entry["origin"]
            if origin_ip not in ip_cache:
                ip_cache[origin_ip] = entry["origin_geo"]
        
        # Check if destination IP already has geolocation data
        if "destination_geo" in entry and entry["destination_geo"]:
            dest_ip = entry["destination"]
            if dest_ip not in ip_cache:
                ip_cache[dest_ip] = entry["destination_geo"]
    
    print(f"Found {len(ip_cache)} IPs with existing geolocation data")
    
    # Second pass: Process each result and fill in missing geolocation data
    for i, entry in enumerate(results):
        updated = False
        
        # Process origin IP
        if entry.get("origin") != "unknown" and "origin_geo" not in entry:
            origin_ip = entry["origin"]
            if origin_ip not in ip_cache:
                print(f"Fetching geolocation for origin IP: {origin_ip}")
                ip_cache[origin_ip] = get_geo_info(origin_ip)
            else:
                print(f"Reusing geolocation for origin IP: {origin_ip}")
            entry["origin_geo"] = ip_cache[origin_ip]
            updated = True
        
        # Process destination IP
        if "destination_geo" not in entry:
            dest_ip = entry["destination"]
            if dest_ip not in ip_cache:
                print(f"Fetching geolocation for destination IP: {dest_ip}")
                ip_cache[dest_ip] = get_geo_info(dest_ip)
            else:
                print(f"Reusing geolocation for destination IP: {dest_ip}")
            entry["destination_geo"] = ip_cache[dest_ip]
            updated = True
        
        # Write results after each entry is processed (only if geolocation was updated)
        if updated:
            with open("results.json", "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"Saved progress: entry {i+1}/{len(results)}")
    
    # Third pass: Clamp ping times for all entries with geolocation data
    print("\nClamping ping times based on speed of light constraints...")
    clamped_count = 0
    for i, entry in enumerate(results):
        # Calculate distance and clamp ping time if both geolocations are available
        origin_geo = entry.get("origin_geo")
        destination_geo = entry.get("destination_geo")
        
        if origin_geo and destination_geo:
            origin_lat = origin_geo.get("latitude")
            origin_lon = origin_geo.get("longitude")
            dest_lat = destination_geo.get("latitude")
            dest_lon = destination_geo.get("longitude")
            
            # Only calculate if we have valid coordinates
            if (origin_lat is not None and origin_lon is not None and 
                dest_lat is not None and dest_lon is not None):
                
                distance = calculate_distance(origin_lat, origin_lon, dest_lat, dest_lon)
                min_ping_time = calculate_minimum_ping_time(distance)
                
                original_ping = entry.get("pingTime")
                clamped_ping = clamp_ping_time(original_ping, min_ping_time)
                
                if clamped_ping != original_ping:
                    entry["pingTime"] = clamped_ping
                    clamped_count += 1
                    if clamped_count <= 10:  # Only print first 10 to avoid spam
                        print(f"  Entry {i+1}: Clamped ping time {original_ping}ms -> {clamped_ping}ms (min: {min_ping_time:.2f}ms, distance: {distance/1000:.2f}km)")
    
    # Save results after clamping
    if clamped_count > 0:
        with open("results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        if clamped_count > 10:
            print(f"  ... and {clamped_count - 10} more entries clamped")
    
    print(f"Processed {len(results)} entries. Clamped {clamped_count} ping times based on speed of light constraints.")
    print(f"Updated results.json")

if __name__ == "__main__":
    process_results()
