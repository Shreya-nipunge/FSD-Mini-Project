# backend/app/routes/api.py
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from pathlib import Path
from pathlib import PureWindowsPath
import re
import uuid
import csv
import math
import pandas as pd
from ..services.auth_utils import get_current_user, get_optional_current_user, require_admin
from ..services import auth_utils
from ..dataset_loader import load_processed, process_and_save
from pydantic import BaseModel

router = APIRouter()

class AdminLoginReq(BaseModel):
    email: str
    password: str

class ComplaintStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None

class ComplaintRejectReq(BaseModel):
    admin_notes: str

class AdminRegisterReq(BaseModel):
    email: str
    password: str
    name: str

class UserLoginReq(BaseModel):
    email: str
    password: str

class UserRegisterReq(BaseModel):
    email: str
    password: str
    name: str

# Cache the processed dataset in memory for faster response, keyed by state.
_processed_data = {}

# Canonical list of all states with processed data — loaded once at runtime
_ALL_STATES: list = []

def _get_all_state_names() -> list:
    """Discover all states from district_coords.json at runtime."""
    global _ALL_STATES
    if _ALL_STATES:
        return _ALL_STATES
    import json
    from pathlib import Path
    coords_file = Path(__file__).resolve().parents[2] / "data" / "district_coords.json"
    if coords_file.exists():
        _ALL_STATES = list(json.loads(coords_file.read_text(encoding="utf-8")).keys())
    else:
        _ALL_STATES = ["Maharashtra", "Karnataka", "Delhi"]
    return _ALL_STATES

def _get_data(state: str = "Maharashtra"):
    state_key = state.lower()

    # Handle National Aggregation
    if state_key == "all":
        if "all" not in _processed_data:
            merged = []
            for s in _get_all_state_names():
                state_rows = load_processed(s)
                if state_rows:
                    merged.extend([{**r, "state_name": s} for r in state_rows])
            _processed_data["all"] = merged
        return _processed_data["all"]

    # Handle Single State (case-insensitive key)
    if state_key not in _processed_data:
        # Find canonical state name (original casing) from coords
        canonical = next(
            (s for s in _get_all_state_names() if s.lower() == state_key),
            state  # fallback to whatever was passed
        )
        _processed_data[state_key] = load_processed(canonical)
        _enrich_state_data(state_key)
    return _processed_data[state_key]

def _enrich_state_data(state_key: str):
    if state_key == "all" or state_key not in _processed_data: return
    db = _read_complaints()
    from collections import defaultdict
    comp_map = defaultdict(list)
    for c in db.get("complaints", []):
        comp_map[c.get("district", "Unknown")].append(c)
        
    for row in _processed_data[state_key]:
        d = row.get("district", "")
        pending, under_review, verified = 0, 0, 0
        for c in comp_map.get(d, []):
            st = c.get("status", "")
            if st in ["UNVERIFIED", "pending"]: pending += 1
            elif st == "UNDER_REVIEW": under_review += 1
            elif st in ["VERIFIED", "resolved"]: verified += 1
            
        total = pending + under_review + verified
        rate = (under_review + verified) / total if total > 0 else 0
        
        resp = "HIGH"
        if total >= 5 and rate < 0.3: resp = "LOW"
        elif total >= 5 and rate < 0.7: resp = "MODERATE"
        
        row["admin_responsiveness"] = resp
        row["response_rate"] = rate

from ..services.analytics_service import compute_safety_score_and_trends, get_rising_crimes, get_state_benchmarks, get_actionable_intelligence, get_gap_alerts, STATE_CENTROIDS

@router.get("/crimes")
def get_crimes(
    state: str = "Maharashtra",
    region: Optional[str] = None,
    crime_type: Optional[str] = None,
    year: Optional[str] = None,
    view_mode: str = "micro",  # 'micro' for district, 'macro' for state
):
    data = _get_data(state)

    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]

    # 1. Macro-Level Aggregation (State Level)
    if view_mode == "macro":
        agg_state = {}
        for r in data:
            s_name = r.get("state_name", state.title())
            if s_name not in agg_state:
                coords = STATE_CENTROIDS.get(s_name, [20, 78])
                agg_state[s_name] = {
                    "district": s_name,
                    "state_name": s_name,
                    "lat": coords[0],
                    "lng": coords[1],
                    "crime_score": 0,
                    "is_macro": True
                }
                for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape"]:
                    agg_state[s_name][k] = 0
            
            agg_state[s_name]["crime_score"] += int(r.get("crime_score", 0))
            for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape"]:
                agg_state[s_name][k] += int(r.get(k, 0))
        
        return {"data": list(agg_state.values()), "total": len(agg_state)}

    # 2. Micro-Level Handling (District Level)
    if not year:
        agg = {}
        for r in data:
            d = r.get("district")
            s = r.get("state_name", state)
            key = (d, s)
            if key not in agg:
                agg[key] = r.copy()
                for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape", "crime_score"]:
                    agg[key][k] = int(r.get(k, 0))
            else:
                for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape", "crime_score"]:
                    agg[key][k] += int(r.get(k, 0))
        data = list(agg.values())

    if region:
        data = [r for r in data if region.lower() in str(r.get("district", "")).lower()]

    if crime_type:
        mapping = {
            "Murder / Homicide": ["murder"],
            "Theft & Robbery": ["robbery", "thefts", "vehicle_theft"],
            "Other IPC Crimes": ["burglary", "cheating"],
            "Crimes Against Women": ["rape"],
        }
        cols = mapping.get(crime_type)
        if cols:
            data = [r for r in data if any(int(r.get(c, 0)) > 0 for c in cols)]

    return {"data": data, "total": len(data)}


@router.get("/summary")
def get_summary(state: str = "Maharashtra", year: Optional[str] = None):
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    
    total_incidents = sum(int(r.get("crime_score", 0)) for r in data)
    
    totals = {"murders": 0, "robberies": 0, "thefts": 0}
    for r in data:
        totals["murders"] += int(r.get("murder", 0))
        totals["robberies"] += int(r.get("robbery", 0))
        totals["thefts"] += int(r.get("thefts", 0))
    
    top_crime = max(totals, key=totals.get) if totals and any(v > 0 for v in totals.values()) else "—"

    # Hottest district (highest crime_score as aggregate)
    hottest = "—"
    if data:
        district_scores = {}
        for r in data:
            key = (r.get("district"), r.get("state_name", state))
            district_scores[key] = district_scores.get(key, 0) + int(r.get("crime_score", 0))
        
        best_key = max(district_scores, key=district_scores.get) if district_scores else None
        if best_key:
            hottest = f"{best_key[0]} ({best_key[1]})" if state.lower() == 'all' else best_key[0]

    return {
        "total_incidents": total_incidents,
        "top_crime": top_crime.title(),
        "hottest_zone": hottest,
        "under_investigation": 0,
    }


@router.get("/by-type")
def get_by_type(state: str = "Maharashtra", year: Optional[str] = None):
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    labels = ["Crimes Against Women", "Crimes Against Children", "Theft & Robbery", "Murder / Homicide", "Assault / Hurt", "Cyber Crime", "Drug / Narcotics", "Riots / Public Order", "Other IPC Crimes"]
    total_score = sum(int(r.get("crime_score", 0)) for r in data)
    values = [0]*9
    if total_score > 0:
        values = [int(total_score * x) for x in [0.15, 0.1, 0.15, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05]]
    return {"labels": labels, "values": values}


@router.get("/trend")
def get_trend(state: str = "Maharashtra"):
    data = _get_data(state)
    yearly = {}
    for r in data:
        y = str(r.get("year"))
        yearly[y] = yearly.get(y, 0) + int(r.get("crime_score", 0))
    sorted_years = sorted(yearly.keys())
    return [{"month": y, "count": yearly[y]} for y in sorted_years]


@router.get("/hotspots")
def get_hotspots(state: str = "Maharashtra", year: Optional[str] = None):
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    agg = {}
    for r in data:
        key = (r.get("district"), r.get("state_name", state))
        agg[key] = agg.get(key, 0) + int(r.get("crime_score", 0))
    sorted_districts = sorted(agg.items(), key=lambda x: x[1], reverse=True)
    hotspots = []
    for idx, ((district, s_name), score) in enumerate(sorted_districts[:5], start=1):
        display_name = f"{district}, {s_name}" if state.lower() == 'all' else district
        hotspots.append({"rank": idx, "area": display_name, "station": district, "count": score, "primary_crime": "Crime Score"})
    return hotspots

@router.get("/analytics/insights")
def get_insights_decision_support(state: str = "all"):
    """Returns top 5 actionable security insights and community gap alerts."""
    data = _get_data(state)
    complaints = _read_complaints().get("complaints", [])
    
    insights = get_actionable_intelligence(data)
    gap_alerts = get_gap_alerts(data, complaints)
    
    return {
        "insights": insights,
        "gap_alerts": gap_alerts
    }


@router.post("/register-user")
def register_user(data: UserRegisterReq):
    return auth_utils.proxy_auth_request(
        "auth/register", {"email": data.email, "password": data.password, "name": data.name}
    )

@router.post("/login-user")
def login_user(data: UserLoginReq):
    return auth_utils.proxy_auth_request(
        "login-user", {"email": data.email, "password": data.password}
    )

@router.post("/register-admin")
def register_admin(data: AdminRegisterReq):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Administrator accounts must be provisioned by the system administrator",
    )

@router.post("/login-admin")
def login_admin(data: AdminLoginReq):
    return auth_utils.proxy_auth_request(
        "login-admin", {"email": data.email, "password": data.password}
    )


from ..services.analytics_service import compute_safety_score_and_trends, get_rising_crimes, get_state_benchmarks
import json

@router.get("/safety-score")
def get_safety_score(district: str, state: str = "Maharashtra"):
    data = _get_data(state)
    return compute_safety_score_and_trends(data, district)

@router.get("/admin/insights")
def get_insights(state: str = "Maharashtra", year: Optional[str] = None):
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    rising = get_rising_crimes(data)
    text = f"{rising[0]['type']} increased by {rising[0]['growth_pct']}% recently." if rising else "No significant recent increases detected."
    return {"rising_crimes": rising, "auto_insight": text}

@router.get("/analytics/benchmarks")
def get_benchmarks():
    all_data = {s: _get_data(s) for s in _get_all_state_names()}
    return get_state_benchmarks(all_data)

# COMPLAINTS DB
COMPLAINTS_FILE = Path(__file__).resolve().parents[2] / 'db' / 'complaints_db.json'
def _read_complaints():
    if not COMPLAINTS_FILE.exists(): return {"complaints": []}
    with COMPLAINTS_FILE.open('r', encoding='utf-8') as f: return json.load(f)

@router.post("/complaints")
async def submit_complaint(
    name: str = Form(...), phone: str = Form(...), email: Optional[str] = Form(None),
    crime_type: str = Form(...), description: str = Form(...), location: str = Form(...),
    state: Optional[str] = Form("Maharashtra"), district: Optional[str] = Form("Unknown"),
    lat: Optional[float] = Form(0.0), lng: Optional[float] = Form(0.0),
    share_description: Optional[str] = Form("true"),
    image: Optional[UploadFile] = File(None), current_user: dict = Depends(get_current_user)
):
    db = _read_complaints()
    import uuid
    from datetime import datetime
    import shutil
    complaint_id = str(uuid.uuid4())[:8]
    
    image_url = None
    if image is not None and image.filename:
        uploads_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        ext = image.filename.split(".")[-1]
        file_name = f"{complaint_id}.{ext}"
        save_path = uploads_dir / file_name
        with save_path.open("wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"http://localhost:8000/uploads/{file_name}"
    
    new_complaint = {
        "id": complaint_id, "name": name, "phone": phone, "email": email, 
        "crime_type": crime_type, "description": description, "location": location, 
        "state": state, "district": district, "lat": lat, "lng": lng, 
        "status": "UNVERIFIED", "confidence": "LOW", 
        "created_at": datetime.utcnow().isoformat() + "Z", 
        "user_email": current_user["sub"],
        "image_url": image_url,
        "share_description": share_description.lower() == "true"
    }
    
    db["complaints"].append(new_complaint)
    with COMPLAINTS_FILE.open('w', encoding='utf-8') as f: json.dump(db, f, indent=2)
    
    # Invalidate Cache to recompute Admin Responsiveness metrics
    state_key = (state or "Maharashtra").lower()
    if state_key in _processed_data: _enrich_state_data(state_key)
    if "all" in _processed_data: del _processed_data["all"]
    
    return {"message": "Complaint submitted successfully", "id": complaint_id}

@router.get("/my-complaints")
def get_my_complaints(current_user: dict = Depends(get_current_user)):
    db = _read_complaints()
    email = current_user["sub"]
    user_complaints = [c for c in db["complaints"] if c.get("user_email") == email]
    
    from datetime import datetime, timezone
    now = datetime.utcnow()
    for c in user_complaints:
        ts_str = c.get("created_at") or c.get("timestamp")
        age = 0
        if ts_str:
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", ""))
                age = (now - ts).total_seconds() / 3600
            except: pass
        c["age_hours"] = round(age, 1)

    # NOTE: We keep 'rejected' here so the user can see their report was denied
    return {"complaints": user_complaints}


@router.get("/complaints")
def get_complaints(
    state: Optional[str] = None,
    status: Optional[str] = None,
    include_rejected: bool = False,
    current_user: Optional[dict] = Depends(get_optional_current_user),
):
    if include_rejected and current_user is None:
        raise HTTPException(status_code=401, detail="Administrator authentication required")
    if include_rejected and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")

    db = _read_complaints()
    res = db["complaints"]
    if state and state.lower() != 'all': res = [c for c in res if c.get("state", "").lower() == state.lower()]
    
    # Critical Privacy Filter: Hide rejected items from public views unless explicitly asked (admin)
    if not include_rejected:
        res = [c for c in res if c.get("status") in ["UNVERIFIED", "UNDER_REVIEW", "VERIFIED", "pending", "resolved"]]
        
    if status: res = [c for c in res if c.get("status") == status]
    
    from datetime import datetime, timezone
    now = datetime.utcnow()
    for c in res:
        ts_str = c.get("created_at") or c.get("timestamp")
        age = 0
        if ts_str:
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", ""))
                age = (now - ts).total_seconds() / 3600
            except: pass
        c["age_hours"] = round(age, 1)

    if current_user is None or current_user.get("role") != "admin":
        public_rows = []
        for complaint in res:
            public = dict(complaint)
            for key in ("name", "phone", "email", "user_email", "reporter_id", "image_url"):
                public.pop(key, None)
            share_description = public.get("share_description")
            if share_description not in (True, 1, "1", "true", "True"):
                public["description"] = None
            public_rows.append(public)
        res = public_rows

    return {"complaints": res}


@router.patch("/complaints/{id}/review")
def review_complaint(id: str, current_user: dict = Depends(require_admin)):
    db = _read_complaints()
    from datetime import datetime
    for c in db["complaints"]:
        if c.get("id") == id:
            c["status"] = "UNDER_REVIEW"
            c["confidence"] = "MEDIUM"
            c["reviewed_at"] = datetime.utcnow().isoformat() + "Z"
            with COMPLAINTS_FILE.open('w', encoding='utf-8') as f: json.dump(db, f, indent=2)
            state_key = c.get("state", "Maharashtra").lower()
            if state_key in _processed_data: _enrich_state_data(state_key)
            if "all" in _processed_data: del _processed_data["all"]
            return {"message": "Complaint is now UNDER_REVIEW"}
    raise HTTPException(status_code=404, detail="Complaint not found")

@router.patch("/complaints/{id}/verify")
def verify_complaint(id: str, current_user: dict = Depends(require_admin)):
    db = _read_complaints()
    from datetime import datetime
    for c in db["complaints"]:
        if c.get("id") == id:
            c["status"] = "VERIFIED"
            c["confidence"] = "HIGH"
            c["reviewed_at"] = datetime.utcnow().isoformat() + "Z"
            with COMPLAINTS_FILE.open('w', encoding='utf-8') as f: json.dump(db, f, indent=2)
            state_key = c.get("state", "Maharashtra").lower()
            if state_key in _processed_data: _enrich_state_data(state_key)
            if "all" in _processed_data: del _processed_data["all"]
            return {"message": "Complaint is now VERIFIED"}
    raise HTTPException(status_code=404, detail="Complaint not found")

@router.patch("/complaints/{id}/reject")
def reject_complaint(id: str, data: ComplaintRejectReq, current_user: dict = Depends(require_admin)):
    db = _read_complaints()
    from datetime import datetime
    for c in db["complaints"]:
        if c.get("id") == id:
            c["status"] = "REJECTED"
            c["admin_notes"] = data.admin_notes
            c["reviewed_at"] = datetime.utcnow().isoformat() + "Z"
            with COMPLAINTS_FILE.open('w', encoding='utf-8') as f: json.dump(db, f, indent=2)
            state_key = c.get("state", "Maharashtra").lower()
            if state_key in _processed_data: _enrich_state_data(state_key)
            if "all" in _processed_data: del _processed_data["all"]
            return {"message": "Complaint is now REJECTED"}
    raise HTTPException(status_code=404, detail="Complaint not found")

DATA_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "data" / "uploads"
MAX_CSV_UPLOAD_BYTES = 10 * 1024 * 1024
_CSV_REQUIRED_COLUMNS = {
    "year": {"year"},
    "state": {"state", "state_name"},
    "district": {"district", "district_name"},
}
_CSV_COUNT_COLUMNS = {
    "murder", "robbery", "other_thefts", "thefts", "theft",
    "auto_motor_vehicle_theft", "vehicle_theft", "motor_vehicle_theft",
    "night_burglary", "burglary", "cheating", "rape",
}


def _normalize_csv_header(value: str) -> str:
    return value.strip().lower().replace(" ", "_").replace("/", "_").replace("-", "_")


def _canonical_upload_state(value: str) -> str:
    state = str(value or "").strip()
    canonical = next((name for name in _get_all_state_names() if name.casefold() == state.casefold()), None)
    if canonical is None:
        raise HTTPException(status_code=400, detail="Select a supported state or union territory")
    return canonical


def _validate_upload_csv(path: Path, target_state: str) -> int:
    """Reject malformed inputs before the processor can write processed data."""
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source, strict=True)
            headers = [_normalize_csv_header(header or "") for header in (reader.fieldnames or [])]
            if not headers or any(not header for header in headers) or len(set(headers)) != len(headers):
                raise HTTPException(status_code=400, detail="CSV has missing or duplicate column names")
            available = set(headers)
            if not all(available.intersection(aliases) for aliases in _CSV_REQUIRED_COLUMNS.values()):
                raise HTTPException(status_code=400, detail="CSV requires year, state, and district columns")
            if not available.intersection(_CSV_COUNT_COLUMNS):
                raise HTTPException(status_code=400, detail="CSV requires at least one supported crime count column")

            state_column = next(name for name in ("state_name", "state") if name in available)
            year_column = "year"
            district_column = next(name for name in ("district_name", "district") if name in available)
            row_count = 0
            target_rows = 0
            for row in reader:
                if None in row or any(value is None for value in row.values()):
                    raise HTTPException(status_code=400, detail="CSV contains a row with an invalid number of columns")
                row = {_normalize_csv_header(key): (value or "").strip() for key, value in row.items()}
                if not row.get(year_column) or not row.get(state_column) or not row.get(district_column):
                    raise HTTPException(status_code=400, detail="CSV rows require year, state, and district values")
                if not row[year_column].isdigit() or len(row[year_column]) != 4:
                    raise HTTPException(status_code=400, detail="CSV contains an invalid year")
                for column in _CSV_COUNT_COLUMNS.intersection(row):
                    value = row[column]
                    if value:
                        try:
                            number = float(value)
                        except ValueError as error:
                            raise HTTPException(status_code=400, detail=f"CSV contains an invalid count in {column}") from error
                        if not math.isfinite(number) or number < 0:
                            raise HTTPException(status_code=400, detail=f"CSV contains an invalid count in {column}")
                row_count += 1
                if row[state_column].casefold() == target_state.casefold():
                    target_rows += 1

            if row_count == 0 or target_rows == 0:
                raise HTTPException(status_code=400, detail="CSV contains no data rows for the selected state")
            return target_rows
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded") from error
    except csv.Error as error:
        raise HTTPException(status_code=400, detail="CSV file is malformed") from error
_CSV_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._ -]{0,250}\.csv$", re.IGNORECASE)


def build_csv_upload_path(upload_dir: Path, original_filename: str) -> Path:
    """Validate a client name, then generate a contained server-side CSV path."""
    name = str(original_filename or "")
    if (
        not name
        or "\x00" in name
        or "/" in name
        or "\\" in name
        or Path(name).is_absolute()
        or PureWindowsPath(name).is_absolute()
        or PureWindowsPath(name).drive
        or not _CSV_NAME_PATTERN.fullmatch(name)
        or Path(name).suffix.lower() != ".csv"
    ):
        raise HTTPException(status_code=400, detail="Upload a CSV file with a safe filename")

    root = Path(upload_dir).resolve()
    target = (root / f"{uuid.uuid4().hex}.csv").resolve()
    try:
        target.relative_to(root)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Invalid upload path") from error
    return target


@router.post("/upload-csv")
async def upload_csv(
    state: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
):
    canonical_state = _canonical_upload_state(state)
    if not file.filename or Path(file.filename).suffix.lower() != ".csv":
        raise HTTPException(status_code=400, detail="Upload a CSV file")
    uploads_dir = DATA_UPLOAD_DIR.resolve()
    uploads_dir.mkdir(parents=True, exist_ok=True)
    file_path = build_csv_upload_path(uploads_dir, file.filename)
    try:
        size = 0
        with open(file_path, "xb") as buffer:
            while chunk := await file.read(64 * 1024):
                size += len(chunk)
                if size > MAX_CSV_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="CSV file exceeds the 10 MB upload limit")
                buffer.write(chunk)
        _validate_upload_csv(file_path, canonical_state)
        # Run the full processing pipeline: normalizes columns, matches districts to coords, 
        # calculates crime_scores, and merges with existing CSV for the state.
        rows = process_and_save(state=canonical_state, source_csv=file_path)
        if not rows:
            raise HTTPException(status_code=400, detail="CSV did not contain processable district records")
        
        # Invalidate the in-memory cache for this exact state to force 
        # all subsequent GET requests to read the freshly processed CSV from disk.
        state_key = canonical_state.lower()
        if state_key in _processed_data:
            del _processed_data[state_key]
            
        return {"status": f"Data processed successfully. {len(rows)} records loaded for {canonical_state}."}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail="CSV processing failed") from error
    finally:
        file_path.unlink(missing_ok=True)
        await file.close()
