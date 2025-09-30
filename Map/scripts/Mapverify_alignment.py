#!/usr/bin/env python3
"""
Verify railway network coverage and train route alignment
"""

import json
import math

def distance_km(lat1, lng1, lat2, lng2):
    """Calculate distance between two points in kilometers"""
    R = 6371  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat/2) * math.sin(dlat/2) + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlng/2) * math.sin(dlng/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def verify_railway_coverage():
    """Verify railway network coverage"""
    
    # Load railway network
    try:
        with open('MapRailways_indian.geojson', 'r', encoding='utf-8') as f:
            railway_data = json.load(f)
    except Exception as e:
        print(f"Error loading railway network: {e}")
        return
    
    # Extract railway bounds
    min_lat, max_lat = float('inf'), float('-inf')
    min_lng, max_lng = float('inf'), float('-inf')
    total_points = 0
    
    for feature in railway_data.get('features', []):
        geom = feature.get('geometry', {})
        if geom.get('type') == 'LineString':
            coords = geom.get('coordinates', [])
            for coord in coords:
                if len(coord) >= 2:
                    lng, lat = coord[0], coord[1]
                    min_lat = min(min_lat, lat)
                    max_lat = max(max_lat, lat)
                    min_lng = min(min_lng, lng)
                    max_lng = max(max_lng, lng)
                    total_points += 1
        elif geom.get('type') == 'MultiLineString':
            for line in geom.get('coordinates', []):
                for coord in line:
                    if len(coord) >= 2:
                        lng, lat = coord[0], coord[1]
                        min_lat = min(min_lat, lat)
                        max_lat = max(max_lat, lat)
                        min_lng = min(min_lng, lng)
                        max_lng = max(max_lng, lng)
                        total_points += 1
    
    print("ðŸ›¤ï¸ Railway Network Coverage:")
    print(f"   Latitude range: {min_lat:.2f} to {max_lat:.2f}")
    print(f"   Longitude range: {min_lng:.2f} to {max_lng:.2f}")
    print(f"   Total railway points: {total_points:,}")
    
    # Load train data and check alignment
    try:
        with open('ultra_Mapoptimized_trains.json', 'r', encoding='utf-8') as f:
            train_data = json.load(f)
    except Exception as e:
        print(f"Error loading train data: {e}")
        return
    
    trains = train_data.get('trains', [])
    print(f"\nðŸš‚ Train Route Analysis:")
    print(f"   Total trains: {len(trains)}")
    
    off_track_trains = []
    for i, train in enumerate(trains[:10]):  # Check first 10 trains
        route_coords = train.get('route_coordinates', [])
        if not route_coords:
            continue
        
        train_name = train.get('train_name', f'Train {i+1}')
        off_track_points = 0
        
        for coord in route_coords:
            if len(coord) >= 2:
                lng, lat = coord[0], coord[1]
                
                # Check if coordinate is within railway network bounds
                if (lat < min_lat or lat > max_lat or 
                    lng < min_lng or lng > max_lng):
                    off_track_points += 1
        
        if off_track_points > 0:
            off_track_trains.append({
                'name': train_name,
                'off_track_points': off_track_points,
                'total_points': len(route_coords)
            })
    
    if off_track_trains:
        print(f"\nâš ï¸ Found trains with coordinates outside railway bounds:")
        for train in off_track_trains:
            percentage = (train['off_track_points'] / train['total_points']) * 100
            print(f"   {train['name']}: {train['off_track_points']}/{train['total_points']} points ({percentage:.1f}%) off bounds")
    else:
        print(f"\nâœ… All checked trains have coordinates within railway network bounds")
    
    # Sample some specific coordinates
    print(f"\nðŸ“ Sample train coordinates (first train, first 3 points):")
    if trains and trains[0].get('route_coordinates'):
        for i, coord in enumerate(trains[0]['route_coordinates'][:3]):
            if len(coord) >= 2:
                print(f"   Point {i+1}: [{coord[1]:.4f}, {coord[0]:.4f}] (lat, lng)")

if __name__ == '__main__':
    verify_railway_coverage()