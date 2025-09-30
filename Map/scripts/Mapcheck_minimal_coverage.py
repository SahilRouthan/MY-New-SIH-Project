#!/usr/bin/env python3
"""
Verify minimal train coverage throughout 24 hours
"""

import json
from datetime import datetime, timedelta

def parse_time(time_str):
    return datetime.strptime(time_str, '%H:%M:%S').time()

def check_minimal_coverage():
    with open('Mapminimal_trains.json', 'r') as f:
        data = json.load(f)
    
    trains = data['trains']
    print(f"Checking coverage for {len(trains)} MINIMAL train schedules...")
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
    
    print("\n24-Hour MINIMAL Train Coverage:")
    print("Hour | Active Trains | Status")
    print("-----|---------------|--------")
    for h in range(24):
        if hourly_coverage[h] >= 20:
            status = "ðŸŸ¢ Excellent"
        elif hourly_coverage[h] >= 15:
            status = "âœ… Good"
        elif hourly_coverage[h] >= 10:
            status = "âš ï¸  Adequate"
        elif hourly_coverage[h] >= 5:
            status = "ðŸŸ¡ Low"
        else:
            status = "âŒ Critical"
        print(f"{h:2d}:00 | {hourly_coverage[h]:3d} trains    | {status}")
    
    min_coverage = min(hourly_coverage)
    max_coverage = max(hourly_coverage)
    avg_coverage = sum(hourly_coverage) / 24
    
    print(f"\nMINIMAL Coverage Statistics:")
    print(f"Minimum trains at any hour: {min_coverage}")
    print(f"Maximum trains at any hour: {max_coverage}")
    print(f"Average trains per hour: {avg_coverage:.1f}")
    print(f"Total train schedules: {len(trains)}")
    print(f"Unique routes: {data['metadata']['unique_routes']}")
    
    # File size
    from pathlib import Path
    file_size = Path('Mapminimal_trains.json').stat().st_size / 1024  # KB
    print(f"File size: {file_size:.0f}KB")
    
    # Compare with previous optimizations
    comparisons = []
    try:
        with open('Mapoptimized_trains.json', 'r') as f:
            orig_data = json.load(f)
        orig_count = len(orig_data['trains'])
        orig_routes = orig_data['metadata']['unique_routes']
        reduction = (1 - len(trains) / orig_count) * 100
        route_reduction = (1 - data['metadata']['unique_routes'] / orig_routes) * 100
        comparisons.append(f"vs Optimized: {orig_count} â†’ {len(trains)} ({reduction:.1f}% fewer trains)")
        comparisons.append(f"vs Optimized routes: {orig_routes} â†’ {data['metadata']['unique_routes']} ({route_reduction:.1f}% fewer routes)")
    except:
        pass
    
    try:
        with open('ultra_Mapoptimized_trains.json', 'r') as f:
            ultra_data = json.load(f)
        ultra_count = len(ultra_data['trains'])
        ultra_routes = ultra_data['metadata']['unique_routes']
        reduction = (1 - len(trains) / ultra_count) * 100
        route_reduction = (1 - data['metadata']['unique_routes'] / ultra_routes) * 100
        comparisons.append(f"vs Ultra-optimized: {ultra_count} â†’ {len(trains)} ({reduction:.1f}% fewer trains)")
        comparisons.append(f"vs Ultra-optimized routes: {ultra_routes} â†’ {data['metadata']['unique_routes']} ({route_reduction:.1f}% fewer routes)")
    except:
        pass
    
    if comparisons:
        print(f"\nComparisons:")
        for comp in comparisons:
            print(f"  {comp}")
    
    # Coverage assessment
    print(f"\nCoverage Assessment:")
    if min_coverage > 0:
        print("âœ… Complete 24/7 coverage maintained with MINIMAL trains!")
        if min_coverage >= 20:
            print("ðŸŽ¯ðŸŽ¯ EXCELLENT coverage (20+ trains/hour)")
        elif min_coverage >= 15:
            print("ðŸŽ¯ TARGET coverage achieved (15+ trains/hour)")
        elif min_coverage >= 10:
            print("âš ï¸  ADEQUATE coverage (10+ trains/hour)")
        else:
            print("ðŸŸ¡ LOW coverage - consider adding trains")
    else:
        print("âŒ Coverage gap detected - trains missing during some hours")
    
    # Efficiency metrics
    efficiency = len(trains) / data['metadata']['unique_routes']
    print(f"\nEfficiency Metrics:")
    print(f"Schedules per route: {efficiency:.1f}")
    print(f"Coverage per KB: {avg_coverage/file_size:.2f} trains/hour per KB")

if __name__ == "__main__":
    check_minimal_coverage()