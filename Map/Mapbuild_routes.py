import json
from collections import defaultdict

# Load schedule and station data
with open("Mapschedules.json", "r", encoding="utf-8") as f:
    schedules = json.load(f)

with open("Mapstations.json", "r", encoding="utf-8") as f:
    stations = json.load(f)

# Map station codes -> info
station_map = {st["code"]: st for st in stations}

# Group stops by train number
routes = defaultdict(list)
train_names = {}

for stop in schedules:
    tn = stop.get("train_number")
    if not tn:
        continue

    # Capture train name once
    if tn not in train_names and stop.get("train_name"):
        train_names[tn] = stop["train_name"]

    code = stop.get("station_code")
    st_info = station_map.get(code, {})

    stop_data = {
        "station_code": code,
        "station_name": st_info.get("name", stop.get("station_name")),
        "lat": st_info.get("lat"),
        "lon": st_info.get("lng"),
        "arrival": stop.get("arrival"),
        "departure": stop.get("departure"),
        "day": stop.get("day")
    }
    routes[tn].append(stop_data)

# Build final JSON
final = []
for tn, stops in routes.items():
    final.append({
        "train_number": tn,
        "train_name": train_names.get(tn, "Unknown"),
        "route": stops
    })

# Always write file
output_file = "train_routes_full.json"
with open(output_file, "w", encoding="utf-8") as fo:
    json.dump(final, fo, indent=2, ensure_ascii=False)

print(f"âœ… JSON file generated: {output_file}")