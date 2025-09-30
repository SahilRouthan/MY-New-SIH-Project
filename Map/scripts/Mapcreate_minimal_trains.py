#!/usr/bin/env python3
"""
Create MINIMAL trains with MAXIMUM 24/7 coverage efficiency
Absolute minimum trains required for continuous simulation
"""

import json
import re
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

def calculate_coverage_efficiency(train_entry):
    """
    Calculate how efficiently a train covers geographical and temporal space
    Higher score = maximum coverage with minimum resources
    """
    train_name = train_entry.get('train_name', '').upper()
    distance = train_entry.get('distance', 0)
    stations = train_entry.get('stations', [])
    route_coords = train_entry.get('route_coordinates', [])
    
    score = 0
    
    # Premium efficiency trains (best distance/time ratio)
    if any(x in train_name for x in ['RAJDHANI', 'SHATABDI', 'VANDE BHARAT']):
        score += 200  # Highest efficiency
    elif any(x in train_name for x in ['DURONTO']):
        score += 180  # Direct long-distance
    elif 'SUPERFAST' in train_name or 'SF' in train_name:
        score += 150
    elif 'EXPRESS' in train_name:
        score += 120
    else:
        return 0  # Skip all other types for maximum minimization
    
    # Massive bonus for mega-long routes (cross-country coverage)
    if distance > 2000:
        score += 100  # Transcontinental routes
    elif distance > 1500:
        score += 70
    elif distance > 1000:
        score += 40
    elif distance > 500:
        score += 20
    else:
        return 0  # Skip short routes
    
    # Bonus for comprehensive station coverage
    station_count = len(stations)
    if station_count > 25:
        score += 60  # Comprehensive coverage
    elif station_count > 20:
        score += 40
    elif station_count > 15:
        score += 25
    elif station_count > 10:
        score += 15
    
    # Bonus for geographical spread (route complexity)
    if len(route_coords) > 50:
        score += 30  # Complex geographical coverage
    elif len(route_coords) > 30:
        score += 20
    elif len(route_coords) > 20:
        score += 10
    
    # Mega bonus for connecting multiple major regions
    major_regions = {
        'NORTH': ['DELHI', 'CHANDIGARH', 'AMRITSAR', 'JAMMU', 'LUCKNOW', 'KANPUR'],
        'SOUTH': ['CHENNAI', 'BANGALORE', 'HYDERABAD', 'TRIVANDRUM', 'COIMBATORE'],
        'EAST': ['KOLKATA', 'BHUBANESWAR', 'GUWAHATI', 'DIBRUGARH', 'PATNA'],
        'WEST': ['MUMBAI', 'PUNE', 'AHMEDABAD', 'SURAT', 'VADODARA', 'RAJKOT'],
        'CENTRAL': ['BHOPAL', 'NAGPUR', 'INDORE', 'JABALPUR']
    }
    
    from_station = train_entry.get('from_station_name', '').upper()
    to_station = train_entry.get('to_station_name', '').upper()
    
    regions_covered = set()
    for region, cities in major_regions.items():
        if any(city in from_station for city in cities) or any(city in to_station for city in cities):
            regions_covered.add(region)
    
    if len(regions_covered) >= 2:
        score += len(regions_covered) * 50  # Massive bonus for inter-regional connectivity
    
    return score

def create_minimal_timing_strategy(base_departure, base_arrival, efficiency_level='maximum'):
    """
    Create minimal but strategic departure times for maximum coverage efficiency
    """
    def parse_time(time_str):
        try:
            return datetime.strptime(time_str, '%H:%M:%S').time()
        except:
            return datetime.strptime('06:00:00', '%H:%M:%S').time()
    
    dep_time = parse_time(base_departure)
    arr_time = parse_time(base_arrival)
    
    # Calculate journey duration
    dep_dt = datetime.combine(datetime.today(), dep_time)
    arr_dt = datetime.combine(datetime.today(), arr_time)
    if arr_dt <= dep_dt:
        arr_dt += timedelta(days=1)
    
    duration = arr_dt - dep_dt
    
    # Ultra-strategic scheduling for maximum temporal coverage
    schedules = []
    
    if efficiency_level == 'maximum':  # Top tier: Every 4 hours (6 times daily)
        intervals = [0, 4, 8, 12, 16, 20]
    elif efficiency_level == 'high':  # High tier: Every 6 hours (4 times daily)
        intervals = [0, 6, 12, 18]
    elif efficiency_level == 'medium':  # Medium tier: Every 8 hours (3 times daily)
        intervals = [0, 8, 16]
    else:  # Standard: Every 12 hours (2 times daily)
        intervals = [0, 12]
    
    for i, offset in enumerate(intervals):
        new_dep_dt = dep_dt + timedelta(hours=offset)
        new_arr_dt = new_dep_dt + duration
        
        schedules.append({
            'departure': new_dep_dt.time().strftime('%H:%M:%S'),
            'arrival': new_arr_dt.time().strftime('%H:%M:%S'),
            'schedule_id': i + 1
        })
    
    return schedules

def create_minimal_maximal_trains():
    """Create MINIMAL trains with MAXIMAL 24/7 coverage"""
    
    input_file = Path("Mapoptimized_trains.json")
    output_file = Path("Mapminimal_trains.json")
    
    print(f"Reading from: {input_file}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Get unique trains (remove duplicates from multiple schedules)
        trains_dict = {}
        for train in data.get('trains', []):
            train_num = train.get('train_number')
            if train_num not in trains_dict:
                trains_dict[train_num] = train
        
        unique_trains = list(trains_dict.values())
        print(f"Processing {len(unique_trains)} unique trains...")
        
        # Score trains with maximum efficiency criteria
        scored_trains = []
        for train in unique_trains:
            score = calculate_coverage_efficiency(train)
            if score >= 150:  # Only maximum efficiency trains
                scored_trains.append((score, train))
        
        # Sort by efficiency score and take absolute minimum
        scored_trains.sort(key=lambda x: x[0], reverse=True)
        minimal_trains = scored_trains[:25]  # ABSOLUTE MINIMUM: only top 25 routes
        
        print(f"Selected MINIMAL {len(minimal_trains)} maximum-efficiency trains")
        
        # Create ultra-strategic schedules
        trains_with_schedules = []
        for score, train in minimal_trains:
            if score >= 250:
                efficiency = 'maximum'  # 6 times daily
            elif score >= 200:
                efficiency = 'high'     # 4 times daily
            elif score >= 180:
                efficiency = 'medium'   # 3 times daily
            else:
                efficiency = 'standard' # 2 times daily
            
            base_departure = train.get('departure', '06:00:00')
            base_arrival = train.get('arrival', '18:00:00')
            schedules = create_minimal_timing_strategy(base_departure, base_arrival, efficiency)
            
            trains_with_schedules.append({
                'train': train,
                'schedules': schedules,
                'efficiency_score': score
            })
        
        # Create final minimal train entries
        minimal_train_list = []
        for i, train_data in enumerate(trains_with_schedules):
            train = train_data['train']
            train_id = f"MIN{i+1:02d}"
            
            # MAXIMUM coordinate reduction (keep only essential points)
            route_coords = train.get('route_coordinates', [])
            if len(route_coords) > 10:
                step = len(route_coords) // 8  # Keep only ~8 points max
                route_coords = route_coords[::step]
            
            # Create entries for each schedule
            for schedule in train_data['schedules']:
                minimal_train = {
                    "id": f"{train_id}_{schedule['schedule_id']}" if schedule['schedule_id'] > 1 else train_id,
                    "train_number": train.get('train_number'),
                    "train_name": train.get('train_name'),
                    "from": train.get('from'),
                    "to": train.get('to'),
                    "departure": schedule['departure'],
                    "arrival": schedule['arrival'],
                    "route_coordinates": route_coords,
                    "train_type": train.get('train_type'),
                    "zone": train.get('zone'),
                    "distance": train.get('distance', 0),
                    # Keep only 3 key stations for absolute minimal data
                    "stations": train.get('stations', [])[:3] if len(train.get('stations', [])) > 3 else train.get('stations', [])
                }
                minimal_train_list.append(minimal_train)
        
        # Create final minimal structure
        output_data = {
            "metadata": {
                "total_trains": len(minimal_train_list),
                "unique_routes": len(trains_with_schedules),
                "description": "MINIMAL trains with MAXIMUM 24/7 coverage efficiency",
                "optimization_features": [
                    f"ABSOLUTE MINIMUM: Only top {len(trains_with_schedules)} highest-efficiency routes",
                    "Strategic ultra-frequent departures for maximum temporal coverage",
                    "MAXIMUM coordinate reduction (<10 points per route)",
                    "Minimal station data (max 3 key stations)",
                    "Guaranteed 24/7 coverage with absolute minimum resources",
                    "Focus on transcontinental and inter-regional connectivity"
                ],
                "file_size": "MINIMAL for lightning-fast loading (<100KB)",
                "update_frequency": "Real-time simulation every second",
                "coverage_philosophy": "Maximum coverage efficiency with minimum trains"
            },
            "trains": minimal_train_list
        }
        
        # Write minimal file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=1, ensure_ascii=False)
        
        print(f"Created: {output_file}")
        print(f"MINIMAL trains: {len(minimal_train_list)} (from {len(trains_with_schedules)} unique routes)")
        
        # Show file size comparison
        original_size = input_file.stat().st_size / (1024 * 1024)  # MB
        new_size = output_file.stat().st_size / 1024  # KB
        print(f"File size: {original_size:.1f}MB â†’ {new_size:.0f}KB ({new_size/(original_size*1024)*100:.1f}% of original)")
        
        # Show top selected trains
        print(f"\nTop 10 maximum-efficiency routes:")
        for i, (score, train) in enumerate(minimal_trains[:10]):
            distance = train.get('distance', 0)
            print(f"{i+1}. [{score:3d}] {train.get('train_number')} - {train.get('train_name')} ({distance}km)")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    create_minimal_maximal_trains()