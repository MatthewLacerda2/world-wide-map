# app.py
import json
import subprocess
import re
import os
from typing import List, Dict, Optional, Union

def read_targets() -> List[str]:
    try:
        with open('targets.json', 'r') as f:
            targets = json.load(f)
            if not isinstance(targets, list):
                raise ValueError("targets.json must contain an array of IPv4 addresses")
            return targets
    except FileNotFoundError:
        print("Error: targets.json not found")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in targets.json: {e}")
        return []

def run_tracert(target: str) -> List[str]:
    try:
        result = subprocess.run(
            ['tracert', '-d', target],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout.split('\n')
    except subprocess.TimeoutExpired:
        print(f"Warning: tracert to {target} timed out")
        return []
    except Exception as e:
        print(f"Error running tracert to {target}: {e}")
        return []

def parse_tracert_line(line: str) -> Optional[Dict[str, Union[str, int, None]]]:
    pattern = r'^\s*(\d+)\s+(\*|\d+)\s+ms\s+(\*|\d+)\s+ms\s+(\*|\d+)\s+ms\s+(.+)$'
    match = re.match(pattern, line)
    
    if not match:
        return None
    
    hop_num = int(match.group(1))
    ping1_str = match.group(2)
    ping2_str = match.group(3)
    ping3_str = match.group(4)
    ip_or_hostname = match.group(5).strip()
    
    ip_pattern = r'\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?'
    ip_match = re.search(ip_pattern, ip_or_hostname)
    
    if not ip_match:
        return None
    
    ip = ip_match.group(1)
    
    valid_pings = []
    for ping_str in [ping1_str, ping2_str, ping3_str]:
        if ping_str != '*':
            try:
                valid_pings.append(int(ping_str))
            except ValueError:
                pass
    
    # If no valid pings, set ping to None (will serialize as null in JSON)
    if not valid_pings:
        ping_value = None
    else:
        ping_value = min(valid_pings)
    
    return {
        'hop': hop_num,
        'ip': ip,
        'ping': ping_value
    }

def process_tracert(target: str) -> List[Dict[str, Union[str, int, None]]]:
    print(f"Running tracert to {target}...")
    output_lines = run_tracert(target)
    
    hops = []
    for line in output_lines:
        hop_data = parse_tracert_line(line)
        if hop_data and hop_data['hop'] > 1:
            hops.append(hop_data)
    
    return hops

def format_results(target: str, hops: List[Dict[str, Union[str, int, None]]]) -> List[Dict[str, Union[str, int, None]]]:
    """Format hops into origin, destination, pingTime format"""
    results = []
    
    for i in range(len(hops)):
        if i == 0:
            origin = "unknown"
        else:
            origin = hops[i-1]['ip']
        
        destination = hops[i]['ip']
        ping_time = hops[i]['ping']
        
        results.append({
            'origin': origin,
            'destination': destination,
            'pingTime': ping_time
        })
    
    return results

def save_results(results: List[Dict[str, Union[str, int, None]]], filename: str = 'results.json'):
    """Save results to JSON file"""
    if not results:
        print("No results to save")
        return
    
    existing_results = []
    if os.path.exists(filename):
        try:
            with open(filename, 'r') as f:
                existing_results = json.load(f)
                if not isinstance(existing_results, list):
                    existing_results = []
        except (json.JSONDecodeError, IOError):
            existing_results = []
    
    all_results = existing_results + results
    
    with open(filename, 'w') as f:
        json.dump(all_results, f, indent=2)

def main():
    targets = read_targets()
    
    if not targets:
        print("No targets found. Please ensure targets.json contains an array of IPv4 addresses.")
        return
    
    print(f"Found {len(targets)} target(s) to traceroute")
    
    all_results = []
    
    for target in targets:
        hops = process_tracert(target)
        if hops:
            results = format_results(target, hops)
            all_results.extend(results)
            print(f"  Processed {len(results)} hops for {target}")
        else:
            print(f"  No hops found for {target}")
    
    if all_results:
        save_results(all_results)
        print(f"\nSaved {len(all_results)} hop results to results.json")
    else:
        print("\nNo results to save")

if __name__ == '__main__':
    main()
