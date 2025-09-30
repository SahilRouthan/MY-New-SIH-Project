#!/usr/bin/env python3
"""
Verify ultra-optimized train coverage throughout 24 hours
"""

import json
from datetime import datetime, timedelta

def parse_time(time_str):
    return datetime.strptime(time_str, '%H:%M:%S').time()

def check_ultra_coverage():
    with open('ultra_Mapoptimized_trains.json', 'r') as f:
        data = json.load(f)
    
    trains = data['trains']
    print(f"Checking coverage for {len(trains)} ultra-optimized train schedules...")
    print(f"From {data['metadata']['unique_routes']} unique routes")
    
    # Count trains active at each hour
    hourly_coverage = [0] * 24
    
    for train in trains:
        dep_time = parse_time(train['departure'])
        arr_time = parse_time(train['arrival'])
        
        dep_hour = dep_time.hour
        arr_hour = arr_time.hour
        
        # Handle overnight journeys
        if arr_hour <= dep_hour:
            # Journey spans midnight
            for h in range(dep_hour, 24):
                hourly_coverage[h] += 1
            for h in range(0, arr_hour + 1):
                hourly_coverage[h] += 1
        else:
            # Same day journey
            for h in range(dep_hour, arr_hour + 1):
                hourly_coverage[h] += 1
    
    print("\n24-Hour Ultra-Optimized Train Coverage:")
    print("Hour | Active Trains")
    print("-----|-------------")
    for h in range(24):
        status = "âœ…" if hourly_coverage[h] >= 15 else "âš ï¸" if hourly_coverage[h] >= 10 else "âŒ"
        print(f"{h:2d}:00 | {hourly_coverage[h]:3d} trains {status}")
    
    min_coverage = min(hourly_coverage)
    max_coverage = max(hourly_coverage)
    avg_coverage = sum(hourly_coverage) / 24
    
    print(f"\nUltra-Optimized Coverage Statistics:")
    print(f"Minimum trains at any hour: {min_coverage}")
    print(f"Maximum trains at any hour: {max_coverage}")
    print(f"Average trains per hour: {avg_coverage:.1f}")
    print(f"Total train schedules: {len(trains)}")
    print(f"Unique routes: {data['metadata']['unique_routes']}")
    
    # Compare with original
    try:
        with open('Mapoptimized_trains.json', 'r') as f:
            original_data = json.load(f)
        original_count = len(original_data['trains'])
        reduction = (1 - len(trains) / original_count) * 100
        print(f"Reduction from original: {original_count} â†’ {len(trains)} ({reduction:.1f}% fewer trains)")
    except:
        pass
    
    if min_coverage > 0:
        print("âœ… Complete 24/7 coverage maintained with minimal trains!")
        if min_coverage >= 15:
            print("ðŸŽ¯ Target coverage achieved (15+ trains/hour)")
        elif min_coverage >= 10:
            print("âš ï¸  Acceptable coverage (10+ trains/hour)")
        else:
            print("âš ï¸  Low coverage - may need adjustment")
    else:
        print("âŒ Coverage gap detected - trains missing during some hours")

if __name__ == "__main__":
    check_ultra_coverage()