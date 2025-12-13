import json
import requests
from typing import Dict, Optional

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
        
        # Write results after each entry is processed
        if updated:
            with open("results.json", "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"Saved progress: entry {i+1}/{len(results)}")
    
    print(f"Processed {len(results)} entries. Updated results.json")

if __name__ == "__main__":
    process_results()
