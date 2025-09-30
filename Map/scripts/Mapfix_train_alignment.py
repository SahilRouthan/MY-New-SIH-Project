#!/usr/bin/env python3
"""
Fix train routes to align with actual railway tracks
Snap train coordinates to the nearest railway lines from MapRailways_indian.geojson
"""

import json
import math
from pathlib import Path

def distance_point_to_line(point, line_start, line_end):
    """Calculate the shortest distance from a point to a line segment"""
    x0, y0 = point
    x1, y1 = line_start
    x2, y2 = line_end
    
    # Calculate the squared length of the line segment
    line_length_squared = (x2 - x1)**2 + (y2 - y1)**2
    
    if line_length_squared == 0:
        # Line segment is actually a point
        return math.sqrt((x0 - x1)**2 + (y0 - y1)**2)
    
    # Calculate the parameter t for the projection of point onto the line
    t = max(0, min(1, ((x0 - x1) * (x2 - x1) + (y0 - y1) * (y2 - y1)) / line_length_squared))
    
    # Calculate the projection point
    projection_x = x1 + t * (x2 - x1)
    projection_y = y1 + t * (y2 - y1)
    
    # Return distance from point to projection
    return math.sqrt((x0 - projection_x)**2 + (y0 - projection_y)**2)

def find_nearest_railway_point(train_point, railway_lines):
    """Find the nearest point on railway lines to snap the train coordinate"""
    min_distance = float('inf')
    best_point = train_point
    
    lon, lat = train_point
    
    for feature in railway_lines:
        if feature['geometry']['type'] == 'MultiLineString':
            for line_coords in feature['geometry']['coordinates']:
                for i in range(len(line_coords) - 1):
                    start_point = line_coords[i]
                    end_point = line_coords[i + 1]
                    
                    # Calculate distance from train point to this line segment
                    distance = distance_point_to_line([lon, lat], start_point, end_point)
                    
                    if distance < min_distance:
                        min_distance = distance
                        # Find the closest point on the line segment
                        x1, y1 = start_point
                        x2, y2 = end_point
                        
                        line_length_squared = (x2 - x1)**2 + (y2 - y1)**2
                        if line_length_squared == 0:
                            best_point = start_point
                        else:
                            t = max(0, min(1, ((lon - x1) * (x2 - x1) + (lat - y1) * (y2 - y1)) / line_length_squared))
                            best_point = [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
    
    return best_point

def create_railway_aligned_routes():
    """Create railway-aligned train routes"""
    
    # Load railway network
    railway_file = Path("MapRailways_indian.geojson")
    train_file = Path("ultra_Mapoptimized_trains.json")
    output_file = Path("ultra_optimized_trains_fixed.json")
    
    print(f"Loading railway network from: {railway_file}")
    
    try:
        with open(railway_file, 'r', encoding='utf-8') as f:
            railway_data = json.load(f)
        
        railway_lines = railway_data['features']
        print(f"Loaded {len(railway_lines)} railway line features")
        
        with open(train_file, 'r', encoding='utf-8') as f:
            train_data = json.load(f)
        
        trains = train_data['trains']
        print(f"Processing {len(trains)} train routes...")
        
        fixed_trains = []
        
        for i, train in enumerate(trains):
            print(f"Processing train {i+1}/{len(trains)}: {train.get('train_name', 'Unknown')}")
            
            original_coords = train.get('route_coordinates', [])
            if not original_coords:
                print(f"  No coordinates found, keeping original")
                fixed_trains.append(train)
                continue
            
            # Snap each coordinate to the nearest railway line
            aligned_coords = []
            for coord in original_coords:
                if len(coord) >= 2:
                    # Convert from [lon, lat] format
                    aligned_point = find_nearest_railway_point(coord, railway_lines)
                    aligned_coords.append(aligned_point)
            
            if aligned_coords:
                # Create fixed train entry
                fixed_train = train.copy()
                fixed_train['route_coordinates'] = aligned_coords
                
                # Add metadata about the fix
                if 'metadata' not in fixed_train:
                    fixed_train['metadata'] = {}
                fixed_train['metadata']['route_aligned'] = True
                fixed_train['metadata']['original_points'] = len(original_coords)
                fixed_train['metadata']['aligned_points'] = len(aligned_coords)
                
                fixed_trains.append(fixed_train)
                print(f"  Aligned {len(original_coords)} coordinates to railway network")
            else:
                print(f"  No valid coordinates to align, keeping original")
                fixed_trains.append(train)
        
        # Update metadata
        output_data = train_data.copy()
        output_data['trains'] = fixed_trains
        output_data['metadata']['railway_alignment'] = {
            'aligned': True,
            'railway_network_file': 'MapRailways_indian.geojson',
            'alignment_method': 'snap_to_nearest_railway_line',
            'total_trains_processed': len(trains),
            'successfully_aligned': len([t for t in fixed_trains if t.get('metadata', {}).get('route_aligned')])
        }
        
        # Update optimization features
        if 'optimization_features' in output_data['metadata']:
            features = output_data['metadata']['optimization_features']
            if 'Route coordinates aligned with actual railway tracks' not in features:
                features.append('Route coordinates aligned with actual railway tracks')
            if 'Trains snap to railway network for realistic simulation' not in features:
                features.append('Trains snap to railway network for realistic simulation')
        
        # Write fixed file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=1, ensure_ascii=False)
        
        print(f"\nCreated: {output_file}")
        print(f"Successfully aligned {output_data['metadata']['railway_alignment']['successfully_aligned']} trains")
        
        # Show file sizes
        original_size = train_file.stat().st_size / 1024  # KB
        new_size = output_file.stat().st_size / 1024  # KB
        print(f"File size: {original_size:.0f}KB â†’ {new_size:.0f}KB")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    create_railway_aligned_routes()