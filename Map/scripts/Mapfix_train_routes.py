#!/usr/bin/env python3
"""
Fix train route coordinates to align with actual railway tracks
Snap train routes to the nearest railway network paths
"""

import json
import math
from pathlib import Path

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in kilometers"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat/2) * math.sin(delta_lat/2) + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(delta_lon/2) * math.sin(delta_lon/2))
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def load_railway_network():
    """Load railway network coordinates from GeoJSON"""
    print("Loading railway network...")
    
    with open('MapRailways_indian.geojson', 'r', encoding='utf-8') as f:
        railway_data = json.load(f)
    
    # Extract all railway track coordinates
    track_points = []
    
    for feature in railway_data.get('features', []):
        geometry = feature.get('geometry', {})
        if geometry.get('type') in ['LineString', 'MultiLineString']:
            coordinates = geometry.get('coordinates', [])
            
            if geometry.get('type') == 'LineString':
                # Single line - coordinates are [[lon, lat], [lon, lat], ...]
                for coord in coordinates:
                    if len(coord) >= 2:
                        track_points.append({
                            'lat': coord[1],
                            'lon': coord[0]
                        })
            
            elif geometry.get('type') == 'MultiLineString':
                # Multiple lines - coordinates are [[[lon, lat], [lon, lat]], [[lon, lat], [lon, lat]]]
                for line in coordinates:
                    for coord in line:
                        if len(coord) >= 2:
                            track_points.append({
                                'lat': coord[1],
                                'lon': coord[0]
                            })
    
    print(f"Loaded {len(track_points)} railway track points")
    return track_points

def find_nearest_track_point(lat, lon, track_points, max_distance_km=10):
    """Find the nearest railway track point within max_distance_km"""
    nearest_point = None
    min_distance = float('inf')
    
    for track_point in track_points:
        distance = haversine_distance(lat, lon, track_point['lat'], track_point['lon'])
        if distance < min_distance and distance <= max_distance_km:
            min_distance = distance
            nearest_point = track_point
    
    return nearest_point, min_distance

def snap_route_to_tracks(route_coordinates, track_points):
    """Snap train route coordinates to nearest railway tracks"""
    snapped_route = []
    
    for coord in route_coordinates:
        if len(coord) >= 2:
            # Input coordinates are [lon, lat]
            original_lon = coord[0]
            original_lat = coord[1]
            
            # Find nearest track point
            nearest_track, distance = find_nearest_track_point(
                original_lat, original_lon, track_points, max_distance_km=20
            )
            
            if nearest_track:
                # Use snapped coordinates
                snapped_route.append([nearest_track['lon'], nearest_track['lat']])
                if distance > 5:  # Log if we had to snap more than 5km
                    print(f"  Snapped point ({original_lat:.4f}, {original_lon:.4f}) to track {distance:.2f}km away")
            else:
                # Keep original if no nearby track found
                snapped_route.append(coord)
                print(f"  No nearby track found for point ({original_lat:.4f}, {original_lon:.4f})")
    
    return snapped_route

def create_realistic_intermediate_points(start_coord, end_coord, track_points, num_points=8):
    """Create realistic intermediate points following railway network"""
    if not start_coord or not end_coord or len(start_coord) < 2 or len(end_coord) < 2:
        return []
    
    start_lat, start_lon = start_coord[1], start_coord[0]
    end_lat, end_lon = end_coord[1], end_coord[0]
    
    # Generate intermediate points along a rough path
    intermediate_points = []
    
    for i in range(1, num_points + 1):
        ratio = i / (num_points + 1)
        
        # Linear interpolation with some realistic deviation
        interp_lat = start_lat + ratio * (end_lat - start_lat)
        interp_lon = start_lon + ratio * (end_lon - start_lon)
        
        # Add slight curve to make routes more realistic
        curve_factor = 0.3 * math.sin(ratio * math.pi)  # Creates a gentle curve
        interp_lat += curve_factor * (end_lat - start_lat) * 0.1
        interp_lon += curve_factor * (end_lon - start_lon) * 0.1
        
        # Snap to nearest track
        nearest_track, distance = find_nearest_track_point(
            interp_lat, interp_lon, track_points, max_distance_km=15
        )
        
        if nearest_track:
            intermediate_points.append([nearest_track['lon'], nearest_track['lat']])
        else:
            intermediate_points.append([interp_lon, interp_lat])
    
    return intermediate_points

def fix_train_routes():
    """Fix all train route coordinates to align with railway tracks"""
    
    # Load railway network
    track_points = load_railway_network()
    
    # Process each optimization level
    files_to_fix = [
        'Mapminimal_trains.json',
        'ultra_Mapoptimized_trains.json', 
        'Mapoptimized_trains.json'
    ]
    
    for file_name in files_to_fix:
        file_path = Path(file_name)
        if not file_path.exists():
            print(f"Skipping {file_name} - file not found")
            continue
            
        print(f"\nProcessing {file_name}...")
        
        # Load train data
        with open(file_path, 'r', encoding='utf-8') as f:
            train_data = json.load(f)
        
        trains = train_data.get('trains', [])
        fixed_count = 0
        
        for train in trains:
            route_coords = train.get('route_coordinates', [])
            
            if not route_coords or len(route_coords) < 2:
                continue
            
            print(f"Fixing route for train {train.get('train_number')} - {train.get('train_name')}")
            print(f"  Original route has {len(route_coords)} points")
            
            # If route is too sparse, add intermediate points
            if len(route_coords) < 8:
                print(f"  Route too sparse, generating intermediate points...")
                start_coord = route_coords[0]
                end_coord = route_coords[-1]
                
                # Create realistic route with intermediate points
                intermediate_points = create_realistic_intermediate_points(
                    start_coord, end_coord, track_points, num_points=6
                )
                
                # Combine start, intermediate, and end points
                new_route = [start_coord] + intermediate_points + [end_coord]
                
                # Snap all points to tracks
                snapped_route = snap_route_to_tracks(new_route, track_points)
                train['route_coordinates'] = snapped_route
                
                print(f"  Generated route with {len(snapped_route)} points")
            else:
                # Snap existing route to tracks
                snapped_route = snap_route_to_tracks(route_coords, track_points)
                train['route_coordinates'] = snapped_route
                
                print(f"  Snapped route to {len(snapped_route)} track points")
            
            fixed_count += 1
        
        # Create backup and save fixed file
        backup_path = file_path.with_suffix('.json.backup')
        if backup_path.exists():
            backup_path.unlink()
        file_path.rename(backup_path)
        
        # Update metadata
        if 'metadata' in train_data:
            if 'optimization_features' not in train_data['metadata']:
                train_data['metadata']['optimization_features'] = []
            train_data['metadata']['optimization_features'].append("Route coordinates aligned with actual railway tracks")
            train_data['metadata']['optimization_features'].append("Trains snap to railway network for realistic simulation")
        
        # Save fixed file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(train_data, f, indent=1, ensure_ascii=False)
        
        print(f"Fixed {fixed_count} train routes in {file_name}")
        print(f"Original backed up to {backup_path}")
    
    print("\nâœ… All train routes fixed and aligned with railway tracks!")
    print("Trains will now follow actual railway lines in the simulation.")

if __name__ == "__main__":
    fix_train_routes()