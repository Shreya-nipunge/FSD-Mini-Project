# backend/app/dataset_loader.py
# Responsible for loading raw IPC crime CSV data, processing it into the required
# state-specific heatmap format, and saving the cleaned dataset to disk.

from pathlib import Path
import csv
from typing import List, Dict, Any

from .crime_processor import process_raw_data

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
UPLOADS_DIR = ROOT / "data" / "uploads"

RAW_FILE = RAW_DIR / "districtwise-ipc-crimes-2017-onwards.csv"

def ensure_dirs() -> None:
    """Ensure all expected data directories exist."""
    for d in (RAW_DIR, PROCESSED_DIR, UPLOADS_DIR):
        d.mkdir(parents=True, exist_ok=True)

def _read_csv(path: Path) -> List[Dict[str, Any]]:
    """Read a CSV into a list of dictionaries."""
    with path.open("r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        return [row for row in reader]

def _write_csv(path: Path, rows: List[Dict[str, Any]], fieldnames: List[str]) -> None:
    """Write a list of dictionaries to CSV."""
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

def load_raw(path: Path | str | None = None) -> List[Dict[str, Any]]:
    """Load the raw dataset from disk.

    If the raw file is missing, an empty list is returned.
    """
    ensure_dirs()
    source = Path(path) if path else RAW_FILE
    if not source.exists():
        return []
    return _read_csv(source)

def load_processed(state: str = "Maharashtra") -> List[Dict[str, Any]]:
    """Load the processed dataset from disk, for a particular state."""
    ensure_dirs()
    state_file = PROCESSED_DIR / f"{state.lower()}_crimes_processed.csv"
    if not state_file.exists():
        # Fallback to existing if it exists under common names
        return []
    return _read_csv(state_file)

def process_and_save(state: str = "Maharashtra", source_csv: Path | str | None = None) -> List[Dict[str, Any]]:
    """Process raw dataset specifically for the given state and save to its processed CSV."""
    ensure_dirs()
    
    output_file = PROCESSED_DIR / f"{state.lower()}_crimes_processed.csv"
    
    # 1. Load existing processed data for this state (if any)
    existing_rows = []
    if output_file.exists():
        existing_rows = _read_csv(output_file)
    
    # 2. Process the new source for the specific state
    raw_rows = load_raw(source_csv)
    new_processed_rows = process_raw_data(raw_rows, state_filter=state)

    if not new_processed_rows:
        # If no new data was found in the source, we return the existing data (or empty)
        return existing_rows

    # 3. Merge existing and new data
    # We use (district, year) as a unique key. New data overwrites existing for the same key.
    merged = {}
    for row in existing_rows:
        key = (row.get("district"), str(row.get("year")))
        merged[key] = row
    
    for row in new_processed_rows:
        key = (row.get("district"), str(row.get("year")))
        merged[key] = row
    
    # 4. Sort by year (ascending)
    final_rows = list(merged.values())
    final_rows.sort(key=lambda x: str(x.get("year", "")))

    # 5. Save the complete merged dataset for this state
    if final_rows:
        fieldnames = list(final_rows[0].keys())
        _write_csv(output_file, final_rows, fieldnames)

    return final_rows

