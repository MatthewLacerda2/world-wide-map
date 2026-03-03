import json
import subprocess
import re
import os
import requests
import time
from typing import List, Optional, Tuple
from pydantic import BaseModel

# Configuration from Environment Variables
API_URL = os.getenv("API_URL") # e.g., https://api-xyz.a.run.app
TRACEROUTE_TIMEOUT = 60
FIRST_HOP_FILTER = 1

# Pydantic models (simplified for transmission)
class HopResult(BaseModel):
    origin: str
    destination: str
    ping_time: Optional[int] = None
    region: str

def get_region() -> str:
    """Fetch the region from GCP metadata server."""
    try:
        # GCP metadata server URL
        url = "http://metadata.google.internal/computeMetadata/v1/instance/zone"
        headers = {"Metadata-Flavor": "Google"}
        response = requests.get(url, headers=headers, timeout=2)
        if response.status_code == 200:
            # Zone looks like 'projects/12345/zones/us-central1-a'
            zone = response.text.split('/')[-1]
            # Convert zone to region (us-central1-a -> us-central1)
            return "-".join(zone.split('-')[:-1])
    except Exception as e:
        print(f"Warning: Could not fetch GCP region: {e}")
    return "unknown-region"

def run_traceroute(target: str) -> Tuple[List[str], int]:
    """Run traceroute command."""
    try:
        # Note: traceroute -I usually requires root, but GCP instances 
        # might allow it or we can use UDP/service default.
        # Here we use standard traceroute without sudo as a starting point.
        cmd = ['traceroute', '-n', target]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=TRACEROUTE_TIMEOUT)
        return result.stdout.split('\n'), result.returncode
    except Exception as e:
        print(f"Error running traceroute to {target}: {e}")
        return [], -1

def parse_line(line: str, hop_num: int) -> Optional[dict]:
    pattern = r'^\s*(\d+)\s+(?:(\S+)\s+)?(?:\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))\s+(\*|\d+\.?\d*)\s+ms'
    match = re.match(pattern, line)
    if not match: return None
    
    ip = match.group(3) if match.group(3) else match.group(4)
    ping_str = match.group(5)
    ping = int(round(float(ping_str))) if ping_str != '*' else None
    
    return {"hop": int(match.group(1)), "ip": ip, "ping": ping}

def process_target(target: str, region: str) -> List[HopResult]:
    stdout_lines, _ = run_traceroute(target)
    hops = []
    for line in stdout_lines:
        parsed = parse_line(line, 0)
        if parsed and parsed['ip']:
            hops.append(parsed)
    
    results = []
    for i in range(len(hops)):
        if hops[i]['hop'] <= FIRST_HOP_FILTER:
            continue
            
        current_ip = hops[i]['ip']
        current_ping = hops[i]['ping']
        
        origin_ip = "unknown"
        if i > 0:
            prev_hop = hops[i-1]
            if prev_hop['hop'] == hops[i]['hop'] - 1:
                origin_ip = prev_hop['ip']
            else:
                continue 

        results.append(HopResult(
            origin=origin_ip,
            destination=current_ip,
            ping_time=current_ping,
            region=region
        ))
    
    return results

def shutdown_instance(region: str):
    """Tell the MIG to resize to 0 so the instance 'begones' forever."""
    print(f"Work for region {region} is done. Resizing MIG to 0...")
    try:
        # We use the gcloud CLI which is pre-installed on GCP images.
        # This tells the specific region's MIG to stop looking for instances.
        group_name = f"worker-mig-{region}"
        subprocess.run([
            'gcloud', 'compute', 'instance-groups', 'managed', 'resize',
            group_name, '--size=0', '--region', region, '--quiet'
        ])
    except Exception as e:
        print(f"Failed to resize MIG: {e}")
        # Fallback to normal shutdown if gcloud fails
        subprocess.run(['sudo', 'shutdown', '-h', 'now'])

def main():
    if not API_URL:
        print("Error: API_URL environment variable not set")
        return

    region = get_region()
    print(f"Worker started in region: {region}")

    all_results = []
    processed_targets = []

    while True:
        try:
            # Ask for next target
            resp = requests.get(f"{API_URL}/targets/next", params={"region": region})
            target = resp.json()
            
            if not target:
                print("No more targets for this region.")
                break
            
            print(f"Processing target: {target}")
            target_results = process_target(target, region)
            all_results.extend(target_results)
            processed_targets.append(target)
            
        except Exception as e:
            print(f"Error in main loop: {e}")
            break

    # Send all results in a single request
    if all_results:
        print(f"Sending {len(all_results)} results to API...")
        try:
            payload = [r.dict() for r in all_results]
            requests.post(f"{API_URL}/results", json=payload)
            
            for t in processed_targets:
                requests.post(f"{API_URL}/targets/complete", params={"region": region, "target": t})
            
            print("Successfully uploaded all results.")
        except Exception as e:
            print(f"Failed to upload results: {e}")

    shutdown_instance(region)

if __name__ == "__main__":
    main()
