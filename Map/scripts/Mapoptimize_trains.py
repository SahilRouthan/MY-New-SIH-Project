#!/usr/bin/env python3
"""
Create an optimized, smaller train file for fast loading and continuous simulation
Focus on major routes with guaranteed 24/7 coverage
"""

import json
import re
from pathlib import Path
from datetime import datetime, timedelta

def calculate_route_score(train_entry):
    """
    Calculate importance score for train routes
    Higher score = more important for continuous simulation
    """
    train_name = train_entry.get('train_name', '').upper()
    train_type = train_entry.get('train_type', '').upper()
    distance = train_entry.get('distance', 0)
    stations = train_entry.get('stations', [])
    route_coords = train_entry.get('route_coordinates', [])
    
    score = 0
    
    # Premium train types (highest priority)
    if any(x in train_name for x in ['RAJDHANI', 'SHATABDI', 'VANDE BHARAT', 'TEJAS']):
        score += 100
    elif any(x in train_name for x in ['DURONTO', 'GARIB RATH', 'HUMSAFAR']):
        score += 90
    elif 'SUPERFAST' in train_name or 'SF' in train_name:
        score += 80
    elif 'EXPRESS' in train_name:
        score += 70
    elif any(x in train_name for x in ['PASSENGER', 'LOCAL']):
        score += 50
    elif any(x in train_type for x in ['EMU', 'DEMU', 'MEMU']):
        score += 60
    
    # Distance bonus (longer routes cover more area)
    distance = distance or 0  # Handle None values
    if distance > 1000:
        score += 30
    elif distance > 500:
        score += 20
    elif distance > 200:
        score += 10
    
    # Station count bonus (more comprehensive coverage)
    station_count = len(stations)
    if station_count > 15:
        score += 25
    elif station_count > 10:
        score += 15
    elif station_count > 5:
        score += 10
    
    # Route coordinates quality bonus
    if len(route_coords) > 20:
        score += 20
    elif len(route_coords) > 10:
        score += 10
    elif len(route_coords) > 5:
        score += 5
    
    # Major city connections (bonus for connecting important cities)
    major_cities = ['DELHI', 'MUMBAI', 'KOLKATA', 'CHENNAI', 'BANGALORE', 'HYDERABAD', 
                   'PUNE', 'AHMEDABAD', 'KANPUR', 'LUCKNOW', 'NAGPUR', 'BHOPAL']
    from_station = train_entry.get('from_station_name', '').upper()
    to_station = train_entry.get('to_station_name', '').upper()
    
    for city in major_cities:
        if city in from_station or city in to_station:
            score += 15
            break
    
    return score

def create_continuous_timing(base_departure, base_arrival, frequency='medium'):
    """
    Create multiple departure times for continuous simulation
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
    
    # Create multiple schedules based on frequency
    schedules = []
    
    if frequency == 'high':  # Every 4 hours
        intervals = [0, 4, 8, 12, 16, 20]
    elif frequency == 'medium':  # Every 8 hours
        intervals = [0, 8, 16]
    else:  # daily - once per day
        intervals = [0]
    
    for i, offset in enumerate(intervals):
        new_dep_dt = dep_dt + timedelta(hours=offset)
        new_arr_dt = new_dep_dt + duration
        
        schedules.append({
            'departure': new_dep_dt.time().strftime('%H:%M:%S'),
            'arrival': new_arr_dt.time().strftime('%H:%M:%S'),
            'schedule_id': i + 1
        })
    
    return schedules

def create_optimized_trains():
    """Create optimized train file for fast loading and continuous simulation"""
    
    input_file = Path("daily_running_trains.json")
    output_file = Path("Mapoptimized_trains.json")
    
    print(f"Reading from: {input_file}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        trains = data.get('trains', [])
        print(f"Processing {len(trains)} daily trains...")
        
        # Score and filter trains
        scored_trains = []
        for train in trains:
            score = calculate_route_score(train)
            if score >= 70:  # Only include high-quality routes
                scored_trains.append((score, train))
        
        # Sort by score and take top trains
        scored_trains.sort(key=lambda x: x[0], reverse=True)
        selected_trains = [train for score, train in scored_trains[:150]]  # Reduced to 150 top trains
        
        print(f"Selected {len(selected_trains)} high-quality trains")
        
        # Create optimized train entries with continuous scheduling
        optimized_trains = []
        
        for i, train in enumerate(selected_trains):
            train_id = f"OPT{i+1:03d}"
            
            # Determine frequency based on train type
            train_name = train.get('train_name', '').upper()
            if any(x in train_name for x in ['LOCAL', 'PASSENGER', 'EMU', 'DEMU']):
                frequency = 'high'
            elif any(x in train_name for x in ['EXPRESS', 'SUPERFAST']):
                frequency = 'medium'
            else:
                frequency = 'daily'
            
            # Create multiple schedules for continuous operation
            base_departure = train.get('departure', '06:00:00')
            base_arrival = train.get('arrival', '18:00:00')
            schedules = create_continuous_timing(base_departure, base_arrival, frequency)
            
            # Optimize route coordinates (reduce points for faster rendering)
            route_coords = train.get('route_coordinates', [])
            if len(route_coords) > 30:
                # Take every nth coordinate to reduce complexity but maintain route shape
                step = len(route_coords) // 25  # Keep ~25 points max
                route_coords = route_coords[::step]
            
            # Create entries for each schedule
            for schedule in schedules:
                optimized_train = {
                    "id": f"{train_id}_{schedule['schedule_id']}" if schedule['schedule_id'] > 1 else train_id,
                    "train_number": train.get('train_number'),
                    "train_name": train.get('train_name'),
                    "from": train.get('from_station_name'),
                    "to": train.get('to_station_name'),
                    "departure": schedule['departure'],
                    "arrival": schedule['arrival'],
                    "route_coordinates": route_coords,
                    "train_type": train.get('train_type'),
                    "zone": train.get('zone'),
                    "distance": train.get('distance', 0),
                    # Simplified stations list (keep only key stations)
                    "stations": train.get('stations', [])[:10] if len(train.get('stations', [])) > 10 else train.get('stations', [])
                }
                optimized_trains.append(optimized_train)
        
        # Create final optimized structure
        output_data = {
            "metadata": {
                "total_trains": len(optimized_trains),
                "unique_routes": len(selected_trains),
                "description": "Optimized trains for fast loading and continuous 24/7 simulation",
                "optimization_features": [
                    "Top 150 highest-priority routes selected",
                    "Multiple departure times for continuous coverage",
                    "Reduced coordinate complexity for faster rendering",
                    "Simplified station lists for better performance",
                    "Guaranteed 24/7 train availability"
                ],
                "file_size": "Optimized for fast loading (<5MB)",
                "update_frequency": "Real-time simulation every second"
            },
            "trains": optimized_trains
        }
        
        # Write optimized file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=1, ensure_ascii=False)  # Reduced indent for smaller file
        
        print(f"Created: {output_file}")
        print(f"Optimized trains: {len(optimized_trains)} (from {len(selected_trains)} unique routes)")
        
        # Show file size comparison
        original_size = input_file.stat().st_size / (1024 * 1024)  # MB
        new_size = output_file.stat().st_size / (1024 * 1024)  # MB
        print(f"File size: {original_size:.1f}MB â†’ {new_size:.1f}MB ({new_size/original_size*100:.1f}% of original)")
        
        # Show top selected trains
        print(f"\nTop 10 selected routes:")
        for i, (score, train) in enumerate(scored_trains[:10]):
            print(f"{i+1}. [{score:3d}] {train.get('train_number')} - {train.get('train_name')}")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    create_optimized_trains()