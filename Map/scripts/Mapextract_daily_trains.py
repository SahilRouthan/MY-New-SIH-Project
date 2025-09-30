#!/usr/bin/env python3
"""
Extract always-running trains from complete_train_routes.json
Creates a new JSON file with trains that run daily/regularly
"""

import json
import re
from pathlib import Path

def is_daily_train(train_entry):
    """
    Determine if a train runs daily based on its name and type
    """
    train_name = train_entry.get('train_name', '').upper()
    train_type = train_entry.get('train_type', '').upper()
    
    # Exclude weekly/special trains
    exclude_patterns = [
        r'WEEKLY',
        r'SPECIAL(?!\s+(SUPERFAST|EXPRESS))',  # Exclude "Special" but allow "Special Express"
        r'FESTIVAL',
        r'HOLIDAY',
        r'SEASONAL'
    ]
    
    for pattern in exclude_patterns:
        if re.search(pattern, train_name):
            return False
    
    # Include trains that typically run daily
    daily_patterns = [
        r'EXPRESS',
        r'SUPERFAST',
        r'RAJDHANI',
        r'SHATABDI', 
        r'DURONTO',
        r'GARIB RATH',
        r'HUMSAFAR',
        r'TEJAS',
        r'VANDE BHARAT',
        r'PASSENGER(?!\s+SPECIAL)',  # Include regular passenger, exclude special
        r'LOCAL',
        r'EMU',
        r'DEMU',
        r'MEMU'
    ]
    
    for pattern in daily_patterns:
        if re.search(pattern, train_name) or re.search(pattern, train_type):
            return True
    
    # Also include based on train number patterns (many daily trains have specific number ranges)
    train_number = train_entry.get('train_number', '')
    if train_number:
        # Major express trains often have numbers in these ranges
        try:
            num = int(train_number)
            # Rajdhani: 12xxx, Shatabdi: 12xxx, Major Express: 12xxx, 22xxx
            # Passenger: 5xxxx, EMU/Local: 6xxxx
            if (12000 <= num <= 12999 or 22000 <= num <= 22999 or 
                50000 <= num <= 59999 or 60000 <= num <= 69999):
                return True
        except ValueError:
            pass
    
    return False

def extract_daily_trains():
    """Extract daily trains and create a new JSON file"""
    
    input_file = Path("New folder/archive/complete_train_routes.json")
    output_file = Path("daily_running_trains.json")
    
    print(f"Reading from: {input_file}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"Total trains in source: {len(data.get('trains', []))}")
        
        # Filter for daily trains
        daily_trains = []
        
        for train in data.get('trains', []):
            if is_daily_train(train):
                daily_trains.append(train)
        
        print(f"Daily trains found: {len(daily_trains)}")
        
        # Create new structure
        output_data = {
            "metadata": {
                "total_trains": len(daily_trains),
                "description": "Daily running trains extracted from complete_train_routes.json",
                "filter_criteria": [
                    "Includes: Express, Superfast, Rajdhani, Shatabdi, Passenger, EMU, DEMU, MEMU",
                    "Excludes: Weekly, Special (non-express), Festival, Holiday, Seasonal trains"
                ],
                "source_file": "complete_train_routes.json",
                "extraction_date": "2025-09-29"
            },
            "trains": daily_trains
        }
        
        # Write to new file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"Created: {output_file}")
        print(f"Successfully extracted {len(daily_trains)} daily running trains")
        
        # Show some examples
        print("\nSample daily trains found:")
        for i, train in enumerate(daily_trains[:5]):
            print(f"{i+1}. {train.get('train_number')} - {train.get('train_name')}")
            
        return True
        
    except FileNotFoundError:
        print(f"Error: Could not find {input_file}")
        return False
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {input_file}: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    extract_daily_trains()