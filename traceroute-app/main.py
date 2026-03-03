#!/usr/bin/env python3
import json
import subprocess
import re
import os
import getpass
import math
import requests
from typing import List, Optional, Dict, Tuple
from pydantic import BaseModel, Field

# --- Constants ---
TARGETS_FILE = 'targets.json'
RESULTS_FILE = 'results.json'
GEOZONES_FILE = 'geozones.json'
TRACEROUTE_TIMEOUT = 120
FIRST_HOP_FILTER = 1  # Skip first hop for user privacy
SPEED_OF_LIGHT_METERS = 299792458
EARTH_RADIUS_METERS = 6371000
SPEED_MULTIPLIER = 3
MAX_LAND_HOP_DISTANCE_KM = 3000

# --- Models ---
class GeoLocation(BaseModel):
    country: str = ""
    region: str = ""
    city: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class HopEntry(BaseModel):
    origin: str
    destination: str
    pingTime: Optional[int] = None
    origin_geo: Optional[GeoLocation] = None
    destination_geo: Optional[GeoLocation] = None

# --- Helper Functions (Geoloc & Distance) ---
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat, dlon = lat2_rad - lat1_rad, lon2_rad - lon1_rad
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_METERS * 2 * math.asin(math.sqrt(a))

def calculate_minimum_ping_time(distance_meters: float) -> float:
    return (distance_meters * SPEED_MULTIPLIER) / SPEED_OF_LIGHT_METERS * 1000

def get_geo_info(ip: str, cache: Dict[str, GeoLocation]) -> Optional[GeoLocation]:
    if ip == "unknown" or not ip:
        return None
    if ip in cache:
        return cache[ip]
    
    try:
        response = requests.get(f"https://ipwhois.app/json/{ip}", timeout=10)
        data = response.json()
        if data.get("success"):
            geo = GeoLocation(
                country=data.get("country", ""),
                region=data.get("region", ""),
                city=data.get("city", ""),
                latitude=data.get("latitude"),
                longitude=data.get("longitude")
            )
            cache[ip] = geo
            return geo
    except Exception as e:
        print(f"  Warning: Error fetching geolocation for {ip}: {e}")
    return None

def load_geozones() -> List[Dict]:
    if not os.path.exists(GEOZONES_FILE):
        return []
    try:
        with open(GEOZONES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            zones = []
            for feature in data.get("features", []):
                geometry = feature.get("geometry") or {}
                if geometry.get("type") == "Polygon":
                    zones.append({
                        "id": feature.get("properties", {}).get("id"),
                        "name": feature.get("properties", {}).get("name"),
                        "polygon": geometry.get("coordinates")[0]
                    })
            return zones
    except Exception as e:
        print(f"  Warning: Error loading geozones: {e}")
        return []

def point_in_polygon(lat: float, lon: float, polygon: List[List[float]]) -> bool:
    x, y = lon, lat
    inside = False
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        if ((y1 > y) != (y2 > y)) and (x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1):
            inside = not inside
    return inside

def find_geozone(lat: float, lon: float, zones: List[Dict]) -> Optional[str]:
    for zone in zones:
        if point_in_polygon(lat, lon, zone["polygon"]):
            return zone["id"]
    return None

# --- Traceroute Logic ---
def run_traceroute(target: str, password: Optional[str]) -> List[str]:
    cmd = ['sudo', '-S', 'traceroute', '-I', '-n', target]
    input_data = (password + '\n') if password else ''
    try:
        result = subprocess.run(cmd, input=input_data, capture_output=True, text=True, timeout=TRACEROUTE_TIMEOUT)
        return result.stdout.split('\n')
    except Exception as e:
        print(f"  Error: Traceroute to {target} failed: {e}")
        return []

def parse_hop(line: str) -> Optional[Tuple[int, str, Optional[int]]]:
    # Regex to match: hop_num IP ping1 ping2 ping3
    pattern = r'^\s*(\d+)\s+(?:(?:\d{1,3}\.){3}\d{1,3}|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))\s+([\d\.]+)\s+ms\s+([\d\.]+)\s+ms\s+([\d\.]+)\s+ms'
    match = re.search(r'^\s*(\d+)\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([\d\.\*]+)\s+ms\s+([\d\.\*]+)\s+ms\s+([\d\.\*]+)\s+ms', line)
    
    if not match:
        return None
    
    hop_num = int(match.group(1))
    ip = match.group(2)
    
    pings = []
    for i in range(3, 6):
        val = match.group(i)
        if val != '*':
            try: pings.append(float(val))
            except: pass
    
    min_ping = int(round(min(pings))) if pings else None
    return hop_num, ip, min_ping

# --- Main Logic ---
def main():
    if not os.path.exists(TARGETS_FILE):
        print(f"Error: {TARGETS_FILE} not found.")
        return

    with open(TARGETS_FILE, 'r') as f:
        targets = json.load(f)

    print(f"Loaded {len(targets)} targets.")
    password = getpass.getpass("Sudo password (for traceroute -I): ")
    
    geozones = load_geozones()
    geo_cache: Dict[str, GeoLocation] = {}
    
    # Load existing results to avoid duplicates and reuse geo data
    results: List[HopEntry] = []
    if os.path.exists(RESULTS_FILE):
        try:
            with open(RESULTS_FILE, 'r') as f:
                raw_results = json.load(f)
                results = [HopEntry(**r) for r in raw_results]
                # Pre-fill cache
                for r in results:
                    if r.origin != "unknown" and r.origin_geo:
                        geo_cache[r.origin] = r.origin_geo
                    if r.destination_geo:
                        geo_cache[r.destination] = r.destination_geo
        except Exception as e:
            print(f"Warning: Could not load existing results: {e}")

    existing_hops = {(r.origin, r.destination) for r in results}

    for target in targets:
        print(f"\nTracing {target}...")
        lines = run_traceroute(target, password)
        
        last_hop_ip = "unknown"
        last_hop_min_ping = 0

        for line in lines:
            parsed = parse_hop(line)
            if not parsed: continue
            
            hop_num, ip, min_ping = parsed
            if hop_num <= FIRST_HOP_FILTER:
                last_hop_ip = ip
                last_hop_min_ping = min_ping or 0
                continue

            if (last_hop_ip, ip) in existing_hops:
                last_hop_ip = ip
                last_hop_min_ping = min_ping or 0
                continue

            # Calculate relative ping
            hop_ping = None
            if min_ping is not None:
                hop_ping = max(0, min_ping - last_hop_min_ping)

            # Geolocate
            origin_geo = get_geo_info(last_hop_ip, geo_cache)
            dest_geo = get_geo_info(ip, geo_cache)

            # Validation & Filtering
            skip = False
            if origin_geo and dest_geo and origin_geo.latitude is not None and dest_geo.latitude is not None:
                dist = calculate_distance(origin_geo.latitude, origin_geo.longitude, 
                                          dest_geo.latitude, dest_geo.longitude)
                dist_km = dist / 1000
                
                # Clamp ping
                min_phys_ping = calculate_minimum_ping_time(dist)
                if hop_ping is not None:
                    hop_ping = max(hop_ping, math.ceil(min_phys_ping))

                # Filter long hops unless in same geozone
                if dist_km > MAX_LAND_HOP_DISTANCE_KM:
                    z1 = find_geozone(origin_geo.latitude, origin_geo.longitude, geozones)
                    z2 = find_geozone(dest_geo.latitude, dest_geo.longitude, geozones)
                    if not (z1 and z2 and z1 == z2):
                        print(f"  Filtering long hop: {dist_km:.1f}km")
                        skip = True

            if not skip:
                entry = HopEntry(
                    origin=last_hop_ip,
                    destination=ip,
                    pingTime=hop_ping,
                    origin_geo=origin_geo,
                    destination_geo=dest_geo
                )
                results.append(entry)
                existing_hops.add((last_hop_ip, ip))
                print(f"  Added hop: {last_hop_ip} -> {ip} ({hop_ping}ms)")

            last_hop_ip = ip
            last_hop_min_ping = min_ping or 0

        # Save after each target
        with open(RESULTS_FILE, 'w') as f:
            json.dump([r.model_dump() for r in results], f, indent=2)

    print("\nCollection complete.")

if __name__ == "__main__":
    main()
