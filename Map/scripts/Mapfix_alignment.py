#!/usr/bin/env python3
"""
Fix train route alignment with railway network
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

def load_railway_network():
    """Load and process railway network from GeoJSON"""
    try:
        with open('MapRailways_indian.geojson', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract all railway coordinates
        railway_points = []
        for feature in data.get('features', []):
            geom = feature.get('geometry', {})
            if geom.get('type') == 'LineString':
                coords = geom.get('coordinates', [])
                for coord in coords:
                    if len(coord) >= 2:
                        railway_points.append([coord[1], coord[0]])  # [lat, lng]
            elif geom.get('type') == 'MultiLineString':
                for line in geom.get('coordinates', []):
                    for coord in line:
                        if len(coord) >= 2:
                            railway_points.append([coord[1], coord[0]])  # [lat, lng]
        
        print(f"Loaded {len(railway_points):,} railway points")
        return railway_points
    except Exception as e:
        print(f"Error loading railway network: {e}")
        return []

def find_nearest_railway_point(target_lat, target_lng, railway_points, max_distance_km=10):
    """Find the nearest railway point within max_distance"""
    if not railway_points:
        return None, float('inf')
    
    min_dist = float('inf')
    nearest_point = None
    
    for point in railway_points:
        dist = distance_km(target_lat, target_lng, point[0], point[1])
        if dist < min_dist and dist <= max_distance_km:
            min_dist = dist
            nearest_point = point
    
    return nearest_point, min_dist

def align_train_routes():
    """Align all train routes with the railway network"""
    
    # Load railway network
    railway_points = load_railway_network()
    if not railway_points:
        print("Failed to load railway network - skipping alignment")
        return
    
    # Load train data
    try:
        with open('ultra_Mapoptimized_trains.json', 'r', encoding='utf-8') as f:
            train_data = json.load(f)
    except Exception as e:
        print(f"Error loading train data: {e}")
        return
    
    trains = train_data.get('trains', [])
    total_trains = len(trains)
    aligned_count = 0
    
    print(f"Aligning {total_trains} train routes...")
    
    for i, train in enumerate(trains):
        route_coords = train.get('route_coordinates', [])
        if not route_coords:
            continue
        
        aligned_coords = []
        alignment_improved = False
        
        for coord in route_coords:
            if len(coord) >= 2:
                lat, lng = coord[1], coord[0]  # Convert [lng, lat] to [lat, lng]
                
                # Find nearest railway point
                nearest, dist = find_nearest_railway_point(lat, lng, railway_points, max_distance_km=5)
                
                if nearest and dist < 2.0:  # If within 2km of railway
                    aligned_coords.append([nearest[1], nearest[0]])  # Convert back to [lng, lat]
                    if dist > 0.1:  # Significant alignment change
                        alignment_improved = True
                else:
                    aligned_coords.append(coord)  # Keep original if too far from railway
        
        if alignment_improved:
            train['route_coordinates'] = aligned_coords
            aligned_count += 1
        
        if (i + 1) % 20 == 0:
            print(f"Processed {i + 1}/{total_trains} trains...")
    
    # Update metadata
    if 'metadata' not in train_data:
        train_data['metadata'] = {}
    
    train_data['metadata']['railway_alignment'] = {
        'aligned': True,
        'alignment_date': '2025-09-29',
        'trains_improved': aligned_count,
        'total_trains': total_trains,
        'max_distance_km': 5,
        'snap_threshold_km': 2.0
    }
    
    # Save aligned data
    try:
        with open('Mapultra_optimized_trains_aligned.json', 'w', encoding='utf-8') as f:
            json.dump(train_data, f, indent=1)
        
        print(f"\nâœ… SUCCESS: Aligned {aligned_count}/{total_trains} train routes")
        print(f"ðŸ“ Saved to: Mapultra_optimized_trains_aligned.json")
        print(f"ðŸ›¤ï¸  Railway alignment complete!")
        
        # Replace original file
        import shutil
        shutil.copy('Mapultra_optimized_trains_aligned.json', 'ultra_Mapoptimized_trains.json')
        print("ðŸ“‹ Original file updated with aligned coordinates")
        
    except Exception as e:
        print(f"Error saving aligned data: {e}")

if __name__ == '__main__':
    align_train_routes()