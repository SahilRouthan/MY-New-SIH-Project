#!/usr/bin/env python3
"""
Verify continuous train coverage throughout 24 hours
"""

import json
from datetime import datetime, timedelta

def parse_time(time_str):
    return datetime.strptime(time_str, '%H:%M:%S').time()

def check_coverage():
    with open('Mapoptimized_trains.json', 'r') as f:
        data = json.load(f)
    
    trains = data['trains']
    print(f"Checking coverage for {len(trains)} train schedules...")
    
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
    
    print("\n24-Hour Train Coverage:")
    print("Hour | Active Trains")
    print("-----|-------------")
    for h in range(24):
        print(f"{h:2d}:00 | {hourly_coverage[h]:3d} trains")
    
    min_coverage = min(hourly_coverage)
    max_coverage = max(hourly_coverage)
    avg_coverage = sum(hourly_coverage) / 24
    
    print(f"\nCoverage Statistics:")
    print(f"Minimum trains at any hour: {min_coverage}")
    print(f"Maximum trains at any hour: {max_coverage}")
    print(f"Average trains per hour: {avg_coverage:.1f}")
    
    if min_coverage > 0:
        print("âœ… Complete 24/7 coverage - trains always running!")
    else:
        print("âš ï¸  Some hours have no trains")

if __name__ == "__main__":
    check_coverage()