import json
import math
import requests
from typing import Dict, Optional

SPEED_OF_LIGHT_METERS = 299792458
EARTH_RADIUS_METERS = 6371000
SPEED_MULTIPLIER = 3
MAX_LAND_HOP_DISTANCE_KM = 3000
PRINT_LIMIT = 10
RESULTS_FILE = "results.json"

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat, dlon = lat2_rad - lat1_rad, lon2_rad - lon1_rad
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    return EARTH_RADIUS_METERS * 2 * math.asin(math.sqrt(a))

def calculate_minimum_ping_time(distance_meters: float) -> float:
    return (distance_meters * SPEED_MULTIPLIER) / SPEED_OF_LIGHT_METERS * 1000

def clamp_ping_time(ping_time: Optional[int], min_ping_time: float) -> Optional[int]:
    return None if ping_time is None else max(ping_time, math.ceil(min_ping_time))

def get_geo_info(ip: str) -> Optional[Dict]:
    try:
        data = requests.get(f"https://ipwhois.app/json/{ip}").json()
        return None if not data.get("success") else {
            "country": data.get("country", ""), "region": data.get("region", ""),
            "city": data.get("city", ""), "latitude": data.get("latitude"), "longitude": data.get("longitude")
        }
    except Exception as e:
        print(f"Error fetching geolocation for {ip}: {e}")
        return None

def save_results(results, filename: str = RESULTS_FILE):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

def process_results():
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        results = json.load(f)
    
    # Build cache and enrich in one pass
    ip_cache = {}
    for entry in results:
        for ip_key, geo_key in [("origin", "origin_geo"), ("destination", "destination_geo")]:
            ip = entry.get(ip_key)
            if ip and ip != "unknown" and geo_key in entry and entry[geo_key]:
                ip_cache.setdefault(ip, entry[geo_key])
    
    # Enrich with geolocation
    for i, entry in enumerate(results):
        updated = False
        for ip_key, geo_key in [("origin", "origin_geo"), ("destination", "destination_geo")]:
            ip = entry.get(ip_key)
            if ip and ip != "unknown" and geo_key not in entry:
                if ip not in ip_cache:
                    ip_cache[ip] = get_geo_info(ip)
                entry[geo_key] = ip_cache[ip]
                updated = True
        if updated:
            save_results(results)
            print(f"Saved progress: entry {i+1}/{len(results)}")
    
    # Clamp and filter in one pass
    clamped_count = 0
    filtered_results = []
    filtered_count = 0
    
    for entry in results:
        origin_geo = entry.get("origin_geo")
        destination_geo = entry.get("destination_geo")
        
        if origin_geo and destination_geo:
            o_lat, o_lon = origin_geo.get("latitude"), origin_geo.get("longitude")
            d_lat, d_lon = destination_geo.get("latitude"), destination_geo.get("longitude")
            
            if o_lat is not None and o_lon is not None and d_lat is not None and d_lon is not None:
                distance = calculate_distance(o_lat, o_lon, d_lat, d_lon)
                distance_km = distance / 1000
                
                # Clamp ping time
                min_ping = calculate_minimum_ping_time(distance)
                original_ping = entry.get("pingTime")
                clamped_ping = clamp_ping_time(original_ping, min_ping)
                if clamped_ping != original_ping:
                    entry["pingTime"] = clamped_ping
                    clamped_count += 1
                    if clamped_count <= PRINT_LIMIT:
                        print(f"Clamped ping {original_ping}ms -> {clamped_ping}ms (distance: {distance_km:.2f}km)")
                
                # Filter long hops
                if distance_km > MAX_LAND_HOP_DISTANCE_KM:
                    filtered_count += 1
                    if filtered_count <= PRINT_LIMIT:
                        print(f"Filtered hop {entry.get('origin')} -> {entry.get('destination')} ({distance_km:.2f}km)")
                    continue
        
        filtered_results.append(entry)
    
    # Save results
    if clamped_count > 0:
        save_results(filtered_results)
    if clamped_count > PRINT_LIMIT:
        print(f"... and {clamped_count - PRINT_LIMIT} more clamped")
    if filtered_count > 0:
        save_results(filtered_results)
        if filtered_count > PRINT_LIMIT:
            print(f"... and {filtered_count - PRINT_LIMIT} more filtered")
        print(f"Filtered {filtered_count} hop(s) > {MAX_LAND_HOP_DISTANCE_KM}km")
    
    print(f"\nProcessed {len(filtered_results)} entries.")
    if clamped_count > 0:
        print(f"Clamped {clamped_count} ping times.")
    print(f"Updated {RESULTS_FILE}")

if __name__ == "__main__":
    process_results()
