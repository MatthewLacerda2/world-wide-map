#!/usr/bin/env python3
"""
Script to analyze results.json and report statistics:
- Number of unique IP addresses
- Total number of hops
"""

import json
import sys
from pathlib import Path

RESULTS_FILE = 'results.json'
TARGETS_FILE = 'targets.json'

def analyze_results(filename: str = RESULTS_FILE):
    """Read results.json and analyze IP addresses and hops"""
    file_path = Path(filename)
    
    if not file_path.exists():
        print(f"Error: {filename} not found")
        return
    
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filename}: {e}")
        return
    except IOError as e:
        print(f"Error: Could not read {filename}: {e}")
        return
    
    if not isinstance(data, list):
        print(f"Error: {filename} must contain an array")
        return
    
    # Collect unique IPs from both origin and destination
    unique_ips = set()
    total_hops = len(data)
    
    for entry in data:
        origin = entry.get('origin', '')
        destination = entry.get('destination', '')
        
        # Add origin IP if it's not "unknown" and not empty
        if origin and origin != 'unknown':
            unique_ips.add(origin)
        
        # Add destination IP if it's not empty
        if destination:
            unique_ips.add(destination)
    
    # Count targets
    targets_path = Path(TARGETS_FILE)
    target_count = 0
    if targets_path.exists():
        try:
            with open(targets_path, 'r') as f:
                targets_data = json.load(f)
                if isinstance(targets_data, list):
                    target_count = len(targets_data)
        except (json.JSONDecodeError, IOError):
            pass
    
    # Print results
    print(f"Results Analysis for {filename}")
    print("=" * 50)
    print(f"Total hops: {total_hops:,}")
    print(f"Unique IP addresses: {len(unique_ips):,}")
    if target_count > 0:
        print(f"Targets in {TARGETS_FILE}: {target_count:,}")
    print()
    print("Remember, as you add more targets, the same hops will show up (diminishing returns)")

if __name__ == '__main__':
    # Allow custom filename as command line argument
    filename = sys.argv[1] if len(sys.argv) > 1 else RESULTS_FILE
    analyze_results(filename)