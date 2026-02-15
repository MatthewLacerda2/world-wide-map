#!/usr/bin/env python3
"""
Analysis tool for traceroute results.
Displays summary statistics and top IPs by connection count.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Set, Counter

RESULTS_FILE = 'results.json'
TARGETS_FILE = 'targets.json'

def load_json(path: Path) -> list:
    if not path.exists():
        return []
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []

def print_header(title: str):
    print(f"\n{title}")
    print("=" * 50)

def analyze_results(results_path: str = RESULTS_FILE):
    path = Path(results_path)
    data = load_json(path)
    
    if not data:
        print(f"Error: No data found in {results_path}")
        return

    unique_ips: Set[str] = set()
    ip_counter: Counter = Counter()
    total_hops = len(data)

    for entry in data:
        origin = entry.get('origin', 'unknown')
        destination = entry.get('destination', '')

        if origin != 'unknown':
            unique_ips.add(origin)
            ip_counter[origin] += 1
        
        if destination:
            unique_ips.add(destination)
            ip_counter[destination] += 1

    targets_data = load_json(Path(TARGETS_FILE))
    target_count = len(targets_data)

    print_header("Traceroute Mapping Statistics")
    print(f"{'Total Hops Collected:':<30} {total_hops:,}")
    print(f"{'Unique IPs Mapped:':<30} {len(unique_ips):,}")
    if target_count:
        print(f"{'Targets in Queue:':<30} {target_count:,}")

    print_header("Top 10 Infrastructure Nodes")
    print(f"{'#':<3} {'IP Address':<20} {'Connections'}")
    print("-" * 50)
    
    for i, (ip, count) in enumerate(ip_counter.most_common(10), 1):
        print(f"{i:<3} {ip:<20} {count:,}")

    print(f"\nNote: You've currently mapped {len(unique_ips)} unique points of presence.")
    print("Keep adding targets to fill the holes in the map!\n")

if __name__ == '__main__':
    filename = sys.argv[1] if len(sys.argv) > 1 else RESULTS_FILE
    analyze_results(filename)