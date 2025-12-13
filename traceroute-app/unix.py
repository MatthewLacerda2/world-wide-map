import json
import subprocess
import re
import os
import getpass
import uuid
from typing import List, Optional, Tuple
from pydantic import BaseModel, ValidationError, field_validator

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
    """Read targets from JSON file with Pydantic validation"""
    try:
        with open('targets.json', 'r') as f:
            data = json.load(f)
            # Validate it's a list of strings
            if not isinstance(data, list):
                raise ValueError("targets.json must contain an array of IPv4 addresses")
            # Validate each item is a string
            targets = [str(item) for item in data]
            return targets
    except FileNotFoundError:
        print("Error: targets.json not found")
        return []
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error: Invalid targets.json: {e}")
        return []

def run_traceroute(target: str, sudo_password: Optional[str] = None) -> Tuple[List[str], List[str], int]:
    try:
        # Always use sudo -S to read password from stdin
        cmd = ['sudo', '-S', 'traceroute', '-I', target]
        result = subprocess.run(
            cmd,
            input=sudo_password + '\n' if sudo_password else '',
            capture_output=True,
            text=True,
            timeout=120
        )
        
        # Return both stdout and stderr lines for debugging
        stdout_lines = result.stdout.split('\n') if result.stdout else []
        stderr_lines = result.stderr.split('\n') if result.stderr else []
        return stdout_lines, stderr_lines, result.returncode
    except subprocess.TimeoutExpired:
        print(f"Warning: traceroute to {target} timed out after 120 seconds")
        return [], [], -1
    except Exception as e:
        print(f"Error running traceroute to {target}: {e}")
        return [], [], -1

def parse_traceroute_line(line: str) -> Optional[Hop]:
    """Parse a traceroute line and return a Hop model"""
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
    
    try:
        return Hop(hop=hop_num, ip=ip, ping=ping_value)
    except ValidationError as e:
        # This shouldn't happen if parsing is correct, but handle it gracefully
        print(f"  Warning: Failed to validate hop data: {e}")
        return None

def process_traceroute(target: str, debug: bool = False, sudo_password: Optional[str] = None) -> List[Hop]:
    print(f"Running traceroute to {target}...")
    stdout_lines, stderr_lines, returncode = run_traceroute(target, sudo_password=sudo_password)
    
    # Check for sudo password errors
    if sudo_password:
        stderr_combined = ' '.join(stderr_lines).lower() if stderr_lines else ''
        if 'sorry' in stderr_combined or 'incorrect password' in stderr_combined or 'authentication failure' in stderr_combined:
            print(f"  Error: Incorrect sudo password. Please run the script again.")
            return []
    
    if debug:
        print(f"  Debug: traceroute exit code: {returncode}")
        print(f"  Debug: Received {len(stdout_lines)} stdout lines, {len(stderr_lines)} stderr lines")
        if stdout_lines:
            print(f"  Debug: stdout lines (first 5):")
            for i, line in enumerate(stdout_lines[:5], 1):
                print(f"    [{i}] {repr(line)}")
        if stderr_lines:
            print(f"  Debug: stderr lines:")
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
            if hop_data.hop > 1:  # Skip first hop for user privacy
                hops.append(hop_data)
    
    # Debug: show if we parsed any lines but filtered them out
    if debug:
        if parsed_count > 0 and len(hops) == 0:
            print(f"  Debug: Parsed {parsed_count} hop(s) but all were filtered (hop <= 1)")
        elif parsed_count == 0:
            print(f"  Debug: Could not parse any hop lines from output")
            # Show a sample line that failed to parse
            sample_lines = [line for line in stdout_lines[:10] if line.strip()]
            if sample_lines:
                print(f"  Debug: Sample line that failed to parse: {repr(sample_lines[0])}")
    
    return hops

def format_results(hops: List[Hop], route_uuid: str) -> List[ResultEntry]:
    """Format hops into origin, destination, pingTime format.
    Calculates ping time as the absolute difference between consecutive hops' ping times."""
    results = []
    
    for i in range(len(hops)):
        if i == 0:
            origin = "unknown"
            # For first hop, use its ping time directly (time from origin to first hop)
            ping_time = hops[i].ping
        else:
            origin = hops[i-1].ip
            # Calculate the difference between consecutive hops
            prev_ping = hops[i-1].ping
            curr_ping = hops[i].ping
            
            if prev_ping is not None and curr_ping is not None:
                # Absolute difference between consecutive hops
                ping_time = abs(curr_ping - prev_ping)
            elif curr_ping is not None:
                # If previous hop had no ping, use current hop's ping
                ping_time = curr_ping
            else:
                # If current hop has no ping, set to None
                ping_time = None
        
        destination = hops[i].ip
        
        results.append(ResultEntry(
            uuid=route_uuid,
            origin=origin,
            destination=destination,
            pingTime=ping_time
        ))
    
    return results

def save_results(results: List[ResultEntry], filename: str = 'results.json'):
    """Save results to JSON file, avoiding duplicates to preserve geolocation data"""
    if not results:
        print("No results to save")
        return
    
    existing_results = []
    if os.path.exists(filename):
        try:
            with open(filename, 'r') as f:
                data = json.load(f)
                if not isinstance(data, list):
                    existing_results = []
                else:
                    # Try to parse existing results, but be lenient for entries with geolocation
                    existing_results = data  # Keep as dicts to preserve geolocation fields
        except (json.JSONDecodeError, IOError) as e:
            print(f"  Warning: Could not read existing results file: {e}")
            existing_results = []
    
    # Create a set of (origin, destination) tuples to track existing entries
    existing_keys = set()
    for entry in existing_results:
        origin = entry.get('origin', 'unknown') if isinstance(entry, dict) else entry.origin
        destination = entry.get('destination', '') if isinstance(entry, dict) else entry.destination
        existing_keys.add((origin, destination))
    
    # Only add new entries that don't already exist
    new_results = []
    skipped_count = 0
    for entry in results:
        key = (entry.origin, entry.destination)
        
        if key not in existing_keys:
            # Convert Pydantic model to dict for JSON serialization
            new_results.append(entry.model_dump())
            existing_keys.add(key)  # Track it to avoid duplicates within new_results
        else:
            skipped_count += 1
    
    if skipped_count > 0:
        print(f"  Skipped {skipped_count} duplicate entries (preserving existing geolocation data)")
    
    all_results = existing_results + new_results
    
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
    
    # Always prompt for sudo password
    print("traceroute -I requires root privileges.")
    sudo_password = get_sudo_password()
    print("Using sudo for traceroute commands...")
    
    all_results = []
    successful_targets = 0
    failed_targets = 0
    
    for target in targets:
        # Generate a unique UUID for this traceroute
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
        print(f"\nSaved {len(all_results)} hop results to results.json")
        print(f"Summary: {successful_targets} target(s) succeeded, {failed_targets} target(s) failed")
    else:
        print("\nNo results to save - all traceroutes failed or returned no parseable hops")
        print(f"Summary: {failed_targets} target(s) failed")
    
    # Clear sudo password from memory for security
    global _sudo_password
    if _sudo_password:
        _sudo_password = None

if __name__ == '__main__':
    main()
