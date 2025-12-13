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

def run_traceroute(target: str) -> List[str]:
    try:
        result = subprocess.run(
            ['traceroute', '-I', target],
            capture_output=True,
            text=True,
            timeout=120
        )
        return result.stdout.split('\n')
    except subprocess.TimeoutExpired:
        print(f"Warning: traceroute to {target} timed out after 120 seconds")
        return []
    except Exception as e:
        print(f"Error running traceroute to {target}: {e}")
        return []

def parse_traceroute_line(line: str) -> Optional[Dict[str, Union[str, int, None]]]:
    
    if re.match(r'^\s*\d+\s+\*\s+\*\s+\*', line):
        return None
    
    pattern = r'^\s*(\d+)\s+(?:(\S+)\s+)?\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)\s+(\*|\d+\.?\d*)\s+ms\s+(\*|\d+\.?\d*)\s+ms\s+(\*|\d+\.?\d*)\s+ms'
    match = re.match(pattern, line)
    
    if not match:
        return None
    
    hop_num = int(match.group(1))
    ip = match.group(3)
    ping1_str = match.group(4)
    ping2_str = match.group(5)
    ping3_str = match.group(6)
    
    valid_pings = []
    for ping_str in [ping1_str, ping2_str, ping3_str]:
        if ping_str != '*':
            try:
                valid_pings.append(float(ping_str))
            except ValueError:
                pass
    
    # If no valid pings, set ping to None (will serialize as null in JSON)
    if not valid_pings:
        ping_value = None
    else:
        ping_value = int(round(min(valid_pings)))
    
    return {
        'hop': hop_num,
        'ip': ip,
        'ping': ping_value
    }

def process_traceroute(target: str, debug: bool = False) -> List[Dict[str, Union[str, int, None]]]:
    print(f"Running traceroute to {target}...")
    output_lines = run_traceroute(target)
    
    if not output_lines:
        if debug:
            print(f"  Debug: No output lines returned for {target}")
        return []
    
    if debug:
        print(f"  Debug: Received {len(output_lines)} lines of output")
        # Show first few non-empty lines for debugging
        non_empty = [line for line in output_lines[:10] if line.strip()]
        if non_empty:
            print(f"  Debug: First few lines: {non_empty[:3]}")
    
    hops = []
    parsed_count = 0
    for line in output_lines:
        hop_data = parse_traceroute_line(line)
        if hop_data:
            parsed_count += 1
            if hop_data['hop'] > 1: # Skip first hop for user privacy
                hops.append(hop_data)
    
    # Debug: show if we parsed any lines but filtered them out
    if parsed_count > 0 and len(hops) == 0:
        print(f"  Debug: Parsed {parsed_count} hop(s) but all were filtered (hop <= 1)")
    elif debug and parsed_count == 0:
        print(f"  Debug: Could not parse any hop lines from output")
    
    return hops

def format_results(hops: List[Dict[str, Union[str, int, None]]]) -> List[Dict[str, Union[str, int, None]]]:
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
    import sys
    debug_mode = '--debug' in sys.argv
    
    targets = read_targets()
    
    if not targets:
        print("No targets found. Please ensure targets.json contains an array of IPv4 addresses.")
        return
    
    print(f"Found {len(targets)} target(s) to traceroute")
    if debug_mode:
        print("Debug mode enabled")
    
    all_results = []
    successful_targets = 0
    failed_targets = 0
    
    for target in targets:
        hops = process_traceroute(target, debug=debug_mode)
        if hops:
            results = format_results(hops)
            all_results.extend(results)
            successful_targets += 1
            print(f"  Processed {len(results)} hops for {target}")
        else:
            failed_targets += 1
            print(f"  No hops found for {target}")
    
    if all_results:
        save_results(all_results)
        print(f"\nSaved {len(all_results)} hop results to results.json")
        print(f"Summary: {successful_targets} target(s) succeeded, {failed_targets} target(s) failed")
    else:
        print("\nNo results to save - all traceroutes failed or returned no parseable hops")
        print(f"Summary: {failed_targets} target(s) failed")

if __name__ == '__main__':
    main()
