import json
import subprocess
import re
import os
import getpass
import uuid
from typing import List, Optional, Tuple
from pydantic import BaseModel, ValidationError

# Constants
TARGETS_FILE = 'targets.json'
RESULTS_FILE = 'results.json'
TRACEROUTE_TIMEOUT = 120
FIRST_HOP_FILTER = 1  # Skip first hop for user privacy

# Pydantic models
class Hop(BaseModel):
    hop: int
    ip: str
    ping: Optional[int] = None

class ResultEntry(BaseModel):
    uuid: str
    origin: str
    destination: str
    pingTime: Optional[int] = None

# Global variable to cache sudo password
_sudo_password = None

def get_sudo_password() -> Optional[str]:
    """Prompt for sudo password once and cache it"""
    global _sudo_password
    if _sudo_password is None:
        _sudo_password = getpass.getpass("traceroute requires sudo privileges. Please enter your password: ")
    return _sudo_password

def read_targets() -> List[str]:
    """Read targets from JSON file"""
    try:
        with open(TARGETS_FILE, 'r') as f:
            data = json.load(f)
            if not isinstance(data, list):
                raise ValueError(f"{TARGETS_FILE} must contain an array of IPv4 addresses")
            return [str(item) for item in data]
    except FileNotFoundError:
        print(f"Error: {TARGETS_FILE} not found")
        return []
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error: Invalid {TARGETS_FILE}: {e}")
        return []

def run_traceroute(target: str, sudo_password: Optional[str] = None) -> Tuple[List[str], List[str], int]:
    """Run traceroute command and return stdout, stderr lines, and return code"""
    try:
        cmd = ['sudo', '-S', 'traceroute', '-I', target]
        input_data = (sudo_password + '\n') if sudo_password else ''
        
        result = subprocess.run(
            cmd,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=TRACEROUTE_TIMEOUT
        )
        
        stdout_lines = result.stdout.split('\n') if result.stdout else []
        stderr_lines = result.stderr.split('\n') if result.stderr else []
        return stdout_lines, stderr_lines, result.returncode
    except subprocess.TimeoutExpired:
        print(f"Warning: traceroute to {target} timed out after {TRACEROUTE_TIMEOUT} seconds")
        return [], [], -1
    except Exception as e:
        print(f"Error running traceroute to {target}: {e}")
        return [], [], -1

def _extract_ping_value(ping_strings: List[str]) -> Optional[int]:
    """Extract minimum ping value from three ping measurements"""
    valid_pings = []
    for ping_str in ping_strings:
        if ping_str != '*':
            try:
                valid_pings.append(float(ping_str))
            except ValueError:
                pass
    return int(round(min(valid_pings))) if valid_pings else None

def parse_traceroute_line(line: str) -> Optional[Hop]:
    """Parse a traceroute line and return a Hop model"""
    # Skip lines with all asterisks (timeouts)
    if re.match(r'^\s*\d+\s+\*\s+\*\s+\*', line):
        return None
    
    pattern = r'^\s*(\d+)\s+(?:(\S+)\s+)?\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)\s+(\*|\d+\.?\d*)\s+ms\s+(\*|\d+\.?\d*)\s+ms\s+(\*|\d+\.?\d*)\s+ms'
    match = re.match(pattern, line)
    
    if not match:
        return None
    
    hop_num = int(match.group(1))
    ip = match.group(3)
    ping_strings = [match.group(4), match.group(5), match.group(6)]
    ping_value = _extract_ping_value(ping_strings)
    
    try:
        return Hop(hop=hop_num, ip=ip, ping=ping_value)
    except ValidationError as e:
        print(f"  Warning: Failed to validate hop data: {e}")
        return None

def _check_sudo_error(stderr_lines: List[str]) -> bool:
    """Check if stderr contains sudo password error messages"""
    if not stderr_lines:
        return False
    stderr_combined = ' '.join(stderr_lines).lower()
    error_keywords = ['sorry', 'incorrect password', 'authentication failure']
    return any(keyword in stderr_combined for keyword in error_keywords)

def process_traceroute(target: str, debug: bool = False, sudo_password: Optional[str] = None) -> List[Hop]:
    """Run traceroute and parse hops, filtering first hop for privacy"""
    print(f"Running traceroute to {target}...")
    stdout_lines, stderr_lines, returncode = run_traceroute(target, sudo_password=sudo_password)
    
    if sudo_password and _check_sudo_error(stderr_lines):
        print("  Error: Incorrect sudo password. Please run the script again.")
        return []
    
    if debug:
        print(f"  Debug: exit code {returncode}, {len(stdout_lines)} stdout, {len(stderr_lines)} stderr lines")
        if stdout_lines:
            print("  Debug: stdout (first 5):")
            for i, line in enumerate(stdout_lines[:5], 1):
                print(f"    [{i}] {repr(line)}")
        if stderr_lines:
            print("  Debug: stderr:")
            for i, line in enumerate(stderr_lines[:5], 1):
                if line.strip():
                    print(f"    [{i}] {repr(line)}")
    
    if not stdout_lines:
        if debug:
            print(f"  Debug: No stdout lines returned for {target}")
        return []
    
    hops = []
    parsed_count = 0
    for line in stdout_lines:
        hop_data = parse_traceroute_line(line)
        if hop_data:
            parsed_count += 1
            if hop_data.hop > FIRST_HOP_FILTER:
                hops.append(hop_data)
    
    if debug:
        if parsed_count > 0 and len(hops) == 0:
            print(f"  Debug: Parsed {parsed_count} hop(s) but all were filtered (hop <= {FIRST_HOP_FILTER})")
        elif parsed_count == 0:
            print("  Debug: Could not parse any hop lines")
            sample = next((line for line in stdout_lines[:10] if line.strip()), None)
            if sample:
                print(f"  Debug: Sample line: {repr(sample)}")
    
    return hops

def _calculate_hop_ping_time(current_hop: Hop, previous_hop: Optional[Hop]) -> Optional[int]:
    """Calculate ping time between two hops"""
    if previous_hop is None:
        return current_hop.ping
    if previous_hop.ping is not None and current_hop.ping is not None:
        return abs(current_hop.ping - previous_hop.ping)
    return current_hop.ping

def format_results(hops: List[Hop], route_uuid: str) -> List[ResultEntry]:
    """Format hops into origin, destination, pingTime format."""
    return [
        ResultEntry(
            uuid=route_uuid,
            origin="unknown" if i == 0 else hops[i-1].ip,
            destination=hop.ip,
            pingTime=_calculate_hop_ping_time(hop, hops[i-1] if i > 0 else None)
        )
        for i, hop in enumerate(hops)
    ]

def _load_existing_results(filename: str) -> List[dict]:
    """Load existing results from JSON file"""
    if not os.path.exists(filename):
        return []
    try:
        with open(filename, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"  Warning: Could not read existing results file: {e}")
        return []

def save_results(results: List[ResultEntry], filename: str = RESULTS_FILE):
    """Save results to JSON file, avoiding duplicates to preserve geolocation data"""
    if not results:
        print("No results to save")
        return
    
    existing_results = _load_existing_results(filename)
    existing_keys = {(e.get('origin', 'unknown'), e.get('destination', '')) for e in existing_results}
    
    new_results = []
    skipped_count = 0
    for entry in results:
        key = (entry.origin, entry.destination)
        if key not in existing_keys:
            new_results.append(entry.model_dump())
            existing_keys.add(key)
        else:
            skipped_count += 1
    
    if skipped_count > 0:
        print(f"  Skipped {skipped_count} duplicate entries (preserving existing geolocation data)")
    
    with open(filename, 'w') as f:
        json.dump(existing_results + new_results, f, indent=2)

def main():
    import sys
    debug_mode = '--debug' in sys.argv
    
    targets = read_targets()
    if not targets:
        print(f"No targets found. Please ensure {TARGETS_FILE} contains an array of IPv4 addresses.")
        return
    
    print(f"Found {len(targets)} target(s) to traceroute")
    if debug_mode:
        print("Debug mode enabled")
    
    print("traceroute -I requires root privileges.")
    sudo_password = get_sudo_password()
    print("Using sudo for traceroute commands...")
    
    all_results = []
    successful_targets = 0
    failed_targets = 0
    
    for target in targets:
        route_uuid = str(uuid.uuid4())
        hops = process_traceroute(target, debug=debug_mode, sudo_password=sudo_password)
        
        if hops:
            results = format_results(hops, route_uuid)
            all_results.extend(results)
            successful_targets += 1
            print(f"  Processed {len(results)} hops for {target} (UUID: {route_uuid})")
        else:
            failed_targets += 1
            print(f"  No hops found for {target}")
    
    if all_results:
        save_results(all_results)
        print(f"\nSaved {len(all_results)} hop results to {RESULTS_FILE}")
        print(f"Summary: {successful_targets} target(s) succeeded, {failed_targets} target(s) failed")
    else:
        print("\nNo results to save - all traceroutes failed or returned no parseable hops")
        print(f"Summary: {failed_targets} target(s) failed")
    
    # Clear sudo password from memory for security
    global _sudo_password
    _sudo_password = None

if __name__ == '__main__':
    main()
