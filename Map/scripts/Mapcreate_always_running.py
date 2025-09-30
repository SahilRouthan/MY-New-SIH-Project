#!/usr/bin/env python3
"""
Create an optimized always-running trains file for continuous simulation
Focus on major routes with multiple daily services
"""

import json
import re
from pathlib import Path
from datetime import datetime, timedelta

def get_train_priority(train_entry):
    """
    Assign priority score to trains based on importance/frequency
    Higher score = more important for continuous simulation
    """
    train_name = train_entry.get('train_name', '').upper()
    train_type = train_entry.get('train_type', '').upper()
    
    score = 0
    
    # High priority trains (major long-distance services)
    if any(x in train_name for x in ['RAJDHANI', 'SHATABDI', 'DURONTO', 'VANDE BHARAT']):
        score += 100
    elif any(x in train_name for x in ['SUPERFAST', 'SF']):
        score += 80
    elif 'EXPRESS' in train_name:
        score += 60
    elif any(x in train_name for x in ['PASSENGER', 'LOCAL']):
        score += 30
    elif any(x in train_type for x in ['EMU', 'DEMU', 'MEMU']):
        score += 40
    
    # Bonus for longer routes (more stations = more comprehensive coverage)
    station_count = len(train_entry.get('stations', []))
    if station_count > 10:
        score += 20
    elif station_count > 5:
        score += 10
    
    # Bonus for routes with coordinates (better for visualization)
    if train_entry.get('route_coordinates') and len(train_entry.get('route_coordinates', [])) > 5:
        score += 15
    
    return score

def create_continuous_schedule(train_entry, train_id):
    """
    Create multiple departures throughout the day for continuous simulation
    """
    base_departure = train_entry.get('departure', '06:00:00')
    base_arrival = train_entry.get('arrival', '18:00:00')
    
    # Parse times
    def parse_time(time_str):
        try:
            return datetime.strptime(time_str, '%H:%M:%S').time()
        except:
            return datetime.strptime('06:00:00', '%H:%M:%S').time()
    
    dep_time = parse_time(base_departure)
    arr_time = parse_time(base_arrival)
    
    # Create multiple schedules throughout the day
    schedules = []
    
    # For high-frequency routes, add multiple departures
    train_name = train_entry.get('train_name', '').upper()
    if any(x in train_name for x in ['LOCAL', 'EMU', 'PASSENGER']):
        # High frequency - every 2 hours
        intervals = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
    elif any(x in train_name for x in ['EXPRESS', 'SUPERFAST']):
        # Medium frequency - twice daily
        intervals = [0, 12]
    else:
        # Regular frequency - once daily
        intervals = [0]
    
    for i, offset in enumerate(intervals):
        new_dep = (datetime.combine(datetime.today(), dep_time) + timedelta(hours=offset)).time()
        new_arr = (datetime.combine(datetime.today(), arr_time) + timedelta(hours=offset)).time()
        
        schedule_id = f"{train_id}_{i+1}" if i > 0 else train_id
        
        schedules.append({
            "id": schedule_id,
            "train_number": train_entry.get('train_number'),
            "train_name": train_entry.get('train_name'),
            "from": train_entry.get('from_station_name'),
            "to": train_entry.get('to_station_name'),
            "departure": new_dep.strftime('%H:%M:%S'),
            "arrival": new_arr.strftime('%H:%M:%S'),
            "route_coordinates": train_entry.get('route_coordinates', []),
            "stations": train_entry.get('stations', []),
            "train_type": train_entry.get('train_type'),
            "zone": train_entry.get('zone'),
            "distance": train_entry.get('distance', 0)
        })
    
    return schedules

def create_always_running_trains():
    """Create optimized file for continuous simulation"""
    
    input_file = Path("daily_running_trains.json")
    output_file = Path("always_running_trains.json")
    
    print(f"Reading from: {input_file}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        trains = data.get('trains', [])
        print(f"Processing {len(trains)} daily trains...")
        
        # Score and sort trains by priority
        scored_trains = [(get_train_priority(train), train) for train in trains]
        scored_trains.sort(key=lambda x: x[0], reverse=True)
        
        # Take top 200 trains for continuous simulation (manageable performance)
        top_trains = [train for score, train in scored_trains[:200]]
        
        print(f"Selected top {len(top_trains)} trains for continuous simulation")
        
        # Create continuous schedules
        all_schedules = []
        for i, train in enumerate(top_trains):
            schedules = create_continuous_schedule(train, f"T{i+1:03d}")
            all_schedules.extend(schedules)
        
        # Create output structure compatible with your simulation system
        output_data = {
            "metadata": {
                "total_schedules": len(all_schedules),
                "unique_trains": len(top_trains),
                "description": "Always running trains optimized for continuous 24/7 simulation",
                "selection_criteria": [
                    "Top priority trains based on type and route coverage",
                    "Multiple departures for high-frequency routes",
                    "Comprehensive route coordinates for visualization",
                    "Major express, superfast, and regional services"
                ],
                "update_frequency": "Real-time simulation every second",
                "source_file": "daily_running_trains.json"
            },
            "trains": all_schedules
        }
        
        # Write optimized file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"Created: {output_file}")
        print(f"Total schedules: {len(all_schedules)} (from {len(top_trains)} unique trains)")
        
        # Show top trains
        print(f"\nTop 10 selected trains:")
        for i, (score, train) in enumerate(scored_trains[:10]):
            print(f"{i+1}. [{score:3d}] {train.get('train_number')} - {train.get('train_name')}")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    create_always_running_trains()