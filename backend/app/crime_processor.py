# backend/app/crime_processor.py
# Contains data transformation logic for the IPC dataset using pure Python (no pandas). 

import json
from pathlib import Path
from typing import List, Dict, Any

ROOT = Path(__file__).resolve().parents[1]
COORDS_FILE = ROOT / "data" / "district_coords.json"

def load_all_coordinates() -> Dict[str, Dict[str, List[float]]]:
    """Load the full coordinate mapping from district_coords.json."""
    if not COORDS_FILE.exists():
        return {}
    try:
        return json.loads(COORDS_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Error loading coordinates: {e}")
        return {}

def normalize_name(name: str) -> str:
    """Robust normalization for district/state names to ensure mapping consistency."""
    if not name: return ""
    # Standardize case, remove hyphens, and strip whitespace
    return name.lower().replace("-", " ").strip()

def process_raw_data(rows: List[Dict[str, Any]], state_filter: str = "Maharashtra") -> List[Dict[str, Any]]:
    """Process raw IPC rows into a district-level crime dataset for a specific state."""

    if not rows:
        return []

    all_coords = load_all_coordinates()
    # Get state coordinates and normalize keys for robust matching
    state_coords = all_coords.get(state_filter, {})
    normalized_coords = {normalize_name(k): v for k, v in state_coords.items()}
    
    target_state_norm = normalize_name(state_filter)

    # Normalize headers and create uniform records.
    normalized_rows = []
    for r in rows:
        normalized_rows.append({
            k.strip().lower().replace(" ", "_").replace("/", "_").replace("-", "_"): (v.strip() if isinstance(v, str) else v)
            for k, v in r.items()
        })

    # Column mapping with aliases
    column_map = {
        "year": ["year"],
        "state_name": ["state_name", "state"],
        "district_name": ["district_name", "district"],
        "murder": ["murder"],
        "robbery": ["robbery"],
        "thefts": ["other_thefts", "thefts", "theft"],
        "vehicle_theft": ["auto_motor_vehicle_theft", "vehicle_theft", "motor_vehicle_theft"],
        "burglary": ["night_burglary", "burglary"],
        "cheating": ["cheating"],
        "rape": ["rape"],
    }

    # Verify critical columns exist
    found_map = {}
    first_row = normalized_rows[0]
    for key, aliases in column_map.items():
        for alias in aliases:
            if alias in first_row:
                found_map[key] = alias
                break
    
    if not all(c in found_map for c in ["year", "state_name", "district_name"]):
        return []

    # Aggregation loop
    agg: Dict[tuple, Dict[str, Any]] = {}
    skipped_districts = set()

    for r in normalized_rows:
        state_r = str(r.get(found_map["state_name"], ""))
        if normalize_name(state_r) != target_state_norm:
            continue
            
        district_raw = str(r.get(found_map["district_name"], "")).strip()
        year = str(r.get(found_map["year"], "")).strip()
        if not district_raw or not year:
            continue

        # Coordinate Guardrail: Only process districts we can render
        dist_norm = normalize_name(district_raw)
        
        # Try exact match
        coord = normalized_coords.get(dist_norm)
        
        if not coord:
            # Try removal of suffixes if raw data was longer
            for suffix in [" delhi", " city", " rural", " urban", " district"]:
                if suffix in dist_norm:
                    shorter = dist_norm.replace(suffix, "").strip()
                    if shorter in normalized_coords:
                        coord = normalized_coords[shorter]
                        break
        
        if not coord:
            # Try appending suffixes if JSON mapping was longer
            for suffix in [" delhi", " city", " rural", " urban", " district"]:
                longer = dist_norm + suffix
                if longer in normalized_coords:
                    coord = normalized_coords[longer]
                    break
        
        if not coord:
            skipped_districts.add(district_raw)
            continue

        key = (district_raw, year)
        if key not in agg:
            agg[key] = {
                "district": district_raw,
                "year": year,
                "lat": coord[0],
                "lng": coord[1],
                "murder": 0,
                "robbery": 0,
                "thefts": 0,
                "vehicle_theft": 0,
                "burglary": 0,
                "cheating": 0,
                "rape": 0,
            }

        for internal_key in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape"]:
            alias = found_map.get(internal_key)
            if alias:
                try:
                    agg[key][internal_key] += int(float(str(r.get(alias, 0)).strip()))
                except: pass

    if skipped_districts:
        print(f"[PROCESSOR] Warning: Skipped {len(skipped_districts)} districts in {state_filter} due to missing coordinates: {list(skipped_districts)}")

    # Precompute safety metrics and final results
    results: List[Dict[str, Any]] = []
    for values in agg.values():
        murder = values["murder"]
        robbery = values["robbery"]
        thefts = values["thefts"]
        vehicle_theft = values["vehicle_theft"]
        burglary = values["burglary"]
        cheating = values["cheating"]
        rape = values["rape"]

        # Precomputed Crime Score
        crime_score = (
            murder * 5 + robbery * 4 + vehicle_theft * 3 + thefts * 2 + 
            burglary * 3 + cheating * 2 + rape * 5
        )
        values["crime_score"] = crime_score
        results.append(values)

    return results

