# backend/app/services/analytics_service.py
from typing import List, Dict, Any

def compute_safety_score_and_trends(data: List[Dict[str, Any]], target_district: str) -> Dict[str, Any]:
    """
    Computes Safety Score, Trends, and Rank for a specific district.
    State data must contain multiple years for trend, and all districts for normalization and rank.
    """
    if not data:
        return {"score": 0, "risk": "Low", "trend": "Stable", "rank": 0, "state_avg_diff": 0}

    # Aggregate total scores per district (latest year)
    latest_year = max(int(r.get("year", 0)) for r in data)
    
    district_latest_scores = {}
    for r in data:
        y = int(r.get("year", 0))
        if y == latest_year:
            district_latest_scores[r.get("district")] = int(r.get("crime_score", 0))

    if not district_latest_scores:
        return {"score": 0, "risk": "Low", "trend": "Stable", "rank": 0, "state_avg_diff": 0}

    max_state_score = max(district_latest_scores.values()) if district_latest_scores else 1
    if max_state_score == 0:
        max_state_score = 1
        
    state_avg_score = sum(district_latest_scores.values()) / len(district_latest_scores)

    target_score_raw = district_latest_scores.get(target_district, 0)
    
    # Normalize per state (Inverse: higher is worse here? No, let's keep it consistent: score is crime severity)
    # The frontend converts it for the circle.
    normalized_score = min(int((target_score_raw / max_state_score) * 100), 100)
    
    # Risk Label
    if normalized_score >= 80:
        risk = "High"
    elif normalized_score >= 40:
        risk = "Moderate"
    else:
        risk = "Low"

    # Rank (Lowest crime score = Rank 1 Safest)
    sorted_districts = sorted(district_latest_scores.items(), key=lambda x: x[1])
    rank = 0
    total_districts = len(sorted_districts)
    for idx, (dist, _) in enumerate(sorted_districts):
        if dist == target_district:
            rank = idx + 1
            break

    # State avg diff in %
    if state_avg_score > 0:
        pct_diff = ((target_score_raw - state_avg_score) / state_avg_score) * 100
    else:
        pct_diff = 0

    # Trend logic
    district_data = [r for r in data if r.get("district") == target_district]
    district_data_sorted = sorted(district_data, key=lambda x: int(x.get("year", 0)))
    trend = "Stable"
    if len(district_data_sorted) >= 2:
        last = int(district_data_sorted[-1].get("crime_score", 0))
        prev = int(district_data_sorted[-2].get("crime_score", 0))
        if last > prev:
            trend = "Increasing"
        elif last < prev:
            trend = "Decreasing"

    return {
        "score": normalized_score,
        "risk": risk,
        "rank": rank,
        "total": total_districts,
        "state_avg_diff": int(pct_diff),
        "trend": trend,
        "raw_score": target_score_raw
    }

def get_rising_crimes(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Computes top 3 rising crimes for the given state dataset.
    """
    if not data:
        return []
        
    latest_year = max(int(r.get("year", 0)) for r in data)
    prev_year = latest_year - 1
    
    crime_keys = ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape"]
    latest_counts = {k: 0 for k in crime_keys}
    prev_counts = {k: 0 for k in crime_keys}
    
    has_prev = False
    
    for r in data:
        y = int(r.get("year", 0))
        if y == latest_year:
            for k in crime_keys:
                latest_counts[k] += int(r.get(k, 0))
        elif y == prev_year:
            has_prev = True
            for k in crime_keys:
                prev_counts[k] += int(r.get(k, 0))

    if not has_prev:
        crimes = [{'type': k.title().replace('_', ' '), 'growth_pct': 0, 'latest': v} for k, v in latest_counts.items()]
        crimes.sort(key=lambda x: x['latest'], reverse=True)
        return crimes[:3]

    results = []
    for k in crime_keys:
        prev = prev_counts[k]
        latest = latest_counts[k]
        growth = ((latest - prev) / prev * 100) if prev > 0 else (100 if latest > 0 else 0)
            
        results.append({
            'type': k.title().replace('_', ' '),
            'growth_pct': int(growth),
            'latest': latest,
            'prev': prev
        })
        
    results.sort(key=lambda x: x['growth_pct'], reverse=True)
    return results[:3]

def get_state_benchmarks(all_state_data: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """
    Computes comparative Normalized Safety Index (NSI) across all states.
    NSI 100 = Safest, 0 = High Alert.
    """
    YEAR = "2022"
    PREV_YEAR = "2021"
    raw_state_stats = []
    
    for state_name, data in all_state_data.items():
        if not data: continue
        latest_rows = [r for r in data if str(r.get("year")) == YEAR]
        prev_rows = [r for r in data if str(r.get("year")) == PREV_YEAR]
        if not latest_rows: continue
        
        avg_score = sum(int(r.get("crime_score", 0)) for r in latest_rows) / len(latest_rows)
        latest_total = sum(int(r.get("crime_score", 0)) for r in latest_rows)
        prev_total = sum(int(r.get("crime_score", 0)) for r in prev_rows) if prev_rows else latest_total
        growth = ((latest_total - prev_total) / prev_total * 100) if prev_total > 0 else 0
        
        raw_state_stats.append({
            "state": state_name.title(),
            "avg_score": avg_score,
            "growth": growth
        })

    if not raw_state_stats: return []

    # NSI Mapping (Higher is safer)
    MAX_REF = 5000 
    for stat in raw_state_stats:
        nsi = max(0, min(100, 100 - (stat["avg_score"] / MAX_REF * 100)))
        if stat["growth"] > 5: trend = "increasing"
        elif stat["growth"] < -5: trend = "decreasing"
        else: trend = "stable"
        stat["nsi"] = int(nsi)
        stat["trend"] = trend

    raw_state_stats.sort(key=lambda x: x["nsi"], reverse=True)
    for idx, stat in enumerate(raw_state_stats):
        stat["rank"] = idx + 1
        stat["insight"] = generate_benchmarking_insight(stat)
    return raw_state_stats

def generate_benchmarking_insight(stat: Dict[str, Any]) -> str:
    state = stat["state"]
    trend = stat["trend"]
    nsi = stat["nsi"]
    insights = []
    if nsi > 80: insights.append(f"{state} maintains a resilient safety profile.")
    elif nsi > 50: insights.append(f"{state} shows moderate concerns in urban clusters.")
    else: insights.append(f"{state} is under high alert due to incident density.")
    
    if trend == "decreasing": insights.append("Data shows a positive downward trend.")
    elif trend == "increasing": insights.append("Recent uptick in reported activities.")
    else: insights.append("Security metrics remain stable.")
    return " ".join(insights)
def compute_complaint_signal(complaints_for_district: List[Dict[str, Any]]) -> int:
    score = 0
    for c in complaints_for_district:
        st = c.get("status", "")
        if st in ["UNVERIFIED", "pending"]:
            score += 1
        elif st == "UNDER_REVIEW":
            score += 2
        elif st in ["VERIFIED", "resolved"]:
            score += 3
    return score

def get_gap_alerts(crime_data: List[Dict[str, Any]], complaints: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Identifies 'Citizen Gaps' where official crime scores are low but 
    citizen complaint density is high, suggesting under-reporting.
    """
    # 1. Group complaints by district
    comp_map = {}
    for c in complaints:
        d = c.get("district", "Unknown")
        if d not in comp_map: comp_map[d] = []
        comp_map[d].append(c)

    # 2. Compare with official crime score
    alerts = []
    THRESHOLD = 5
    for r in crime_data:
        dist = r.get("district")
        score = int(r.get("crime_score", 0))
        district_complaints = comp_map.get(dist, [])
        
        signal = compute_complaint_signal(district_complaints)
        
        # Anomaly Detection Logic: High Citizen Signal vs Low Official Count
        if signal >= THRESHOLD and score < 50:
            alerts.append({
                "district": dist,
                "state": r.get("state_name", "Unknown"),
                "complaint_count": len(district_complaints),
                "official_score": score,
                "signal_strength": min(100, signal * 10), # scale up for UI visualization
                "severity": "CRITICAL" if signal > 15 else "MODERATE"
            })
    return alerts

def get_actionable_intelligence(dataList: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyzes district-level growth between 2021 -> 2022 to generate prioritized 
    law enforcement alerts and decision support insights.
    """
    if not dataList:
        return []

    YEAR = "2022"
    PREV_YEAR = "2021"
    
    # Classification Logic
    def get_cat(r):
        if int(r.get("murder", 0)) > 0 or int(r.get("rape", 0)) > 0: return "Violent"
        if int(r.get("cheating", 0)) > 0: return "Financial"
        return "Property"

    latest_performance = {}
    prev_performance = {}
    
    for r in dataList:
        y = str(r.get("year", ""))
        key = (r.get("district"), r.get("state_name", "Unknown"))
        if y == YEAR:
            latest_performance[key] = {
                "score": int(r.get("crime_score", 0)),
                "category": get_cat(r)
            }
        elif y == PREV_YEAR:
            prev_performance[key] = int(r.get("crime_score", 0))

    insights = []
    for key, latest in latest_performance.items():
        prev = prev_performance.get(key, 0)
        district, state = key
        latest_score = latest["score"]
        category = latest["category"]
        
        growth = ((latest_score - prev) / prev * 100) if prev > 0 else (100 if latest_score > 0 else 0)
            
        if growth > 15:
            priority, status = "HIGH", "🔴"
            focus = f"Immediate intervention required for rising {category} incidents in {district}."
        elif growth > 5:
            priority, status = "MODERATE", "🟡"
            focus = f"Monitor {category} clusters in {district} for further escalation."
        else:
            priority, status = "STABLE", "🟢"
            focus = f"Performance in {district} ({category}) remains stable relative to historical norms."

        insights.append({
            "priority": priority,
            "status": status,
            "district": district,
            "state_name": state,
            "category": category,
            "growth_pct": int(growth),
            "observation": f"{category} shifted by {int(growth)}% in {district} ({PREV_YEAR} → {YEAR})",
            "suggested_focus": focus,
            "time_range": f"{PREV_YEAR} → {YEAR}"
        })

    insights.sort(key=lambda x: x["growth_pct"], reverse=True)
    return insights[:5]

# Macro View Centroids — all 36 states/UTs
STATE_CENTROIDS = {
    "Andhra Pradesh": [15.9129, 79.7400],
    "Arunachal Pradesh": [28.2180, 94.7278],
    "Assam": [26.2006, 92.9376],
    "Bihar": [25.0961, 85.3131],
    "Chhattisgarh": [21.2787, 81.8661],
    "Goa": [15.2993, 74.1240],
    "Gujarat": [22.2587, 71.1924],
    "Haryana": [29.0588, 76.0856],
    "Himachal Pradesh": [31.1048, 77.1734],
    "Jammu And Kashmir": [33.7782, 76.5762],
    "Jharkhand": [23.6102, 85.2799],
    "Karnataka": [15.3173, 75.7139],
    "Kerala": [10.8505, 76.2711],
    "Madhya Pradesh": [22.9734, 78.6569],
    "Maharashtra": [19.7515, 75.7139],
    "Manipur": [24.6637, 93.9063],
    "Meghalaya": [25.4670, 91.3662],
    "Mizoram": [23.1645, 92.9376],
    "Nagaland": [26.1584, 94.5624],
    "Odisha": [20.9517, 85.0985],
    "Punjab": [31.1471, 75.3412],
    "Rajasthan": [27.0238, 74.2179],
    "Sikkim": [27.5330, 88.5122],
    "Tamil Nadu": [11.1271, 78.6569],
    "Telangana": [18.1124, 79.0193],
    "Tripura": [23.9408, 91.9882],
    "Uttar Pradesh": [26.8467, 80.9462],
    "Uttarakhand": [30.0668, 79.0193],
    "West Bengal": [22.9868, 87.8550],
    "Andaman And Nicobar Islands": [11.7401, 92.6586],
    "Chandigarh": [30.7333, 76.7794],
    "The Dadra And Nagar Haveli And Daman And Diu": [20.3974, 72.8328],
    "Delhi": [28.7041, 77.1025],
    "Lakshadweep": [10.5667, 72.6417],
    "Puducherry": [11.9416, 79.8083],
    "Ladakh": [34.1526, 77.5770],
}
