"""
FastAPI backend — Bus Tracker with ML-powered ETA
Run: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import asyncio
import json
import math
import os
import random
from datetime import datetime
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# ── Load model ────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "eta_model.joblib")
model = joblib.load(MODEL_PATH)
print(f"[startup] ETA model loaded from {MODEL_PATH}")

FEATURES = ["distance_km", "avg_speed_kmh", "hour_of_day",
            "day_of_week", "traffic_factor", "stops_remaining"]

SLEEP_INTERVALS = {
        "good": 5,
        "fluctuating": 8,
        "poor": 12
    }
# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Bus Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route config (Mumbai example) ─────────────────────────────────────────────
ROUTE_WAYPOINTS = [
    (19.135697, 72.855172),
    (19.134228, 72.855103),
    (19.132675, 72.855164),
    (19.131064, 72.855228),
    (19.129572, 72.855164),
    (19.128078, 72.855417),
    (19.126767, 72.855544),
    (19.125572, 72.855986),
    (19.124794, 72.856556),
    (19.122944, 72.856492),
    (19.121931, 72.856303),
    (19.120258, 72.855669),
    (19.118586, 72.855542),
    (19.117453, 72.855228),
    (19.116439, 72.855036),
    (19.115244, 72.854975),
    (19.114050, 72.854847),
    (19.112439, 72.854469),
    (19.110828, 72.854153),
    (19.108797, 72.853900),
    (19.105872, 72.853900),
    (19.102836, 72.854278),
    (19.099914, 72.854422),
    (19.097197, 72.853200),
    (19.094936, 72.852461),
    (19.093225, 72.851047),
    (19.092117, 72.848553),
    (19.090961, 72.845867),
    (19.089253, 72.844614),
    (19.086639, 72.845867)
]
DESTINATION = ROUTE_WAYPOINTS[-1]

# ── Helpers ───────────────────────────────────────────────────────────────────

def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def total_remaining_distance(wp_index: int, lat: float, lon: float) -> float:
    """Remaining route distance from current position through remaining waypoints."""
    if wp_index >= len(ROUTE_WAYPOINTS) - 1:
        return haversine_km(lat, lon, *DESTINATION)
    dist = haversine_km(lat, lon, *ROUTE_WAYPOINTS[wp_index + 1])
    for i in range(wp_index + 1, len(ROUTE_WAYPOINTS) - 1):
        dist += haversine_km(*ROUTE_WAYPOINTS[i], *ROUTE_WAYPOINTS[i + 1])
    return dist


def network_quality(speed: float) -> str:
    """Mock network quality based on simulated signal."""
    r = random.random()
    if r > 0.85:
        return "poor"
    if r > 0.60:
        return "fluctuating"
    return "good"


def predict_eta(distance_km: float, avg_speed_kmh: float,
                traffic_factor: float, stops_remaining: int) -> float:
    now = datetime.now()
    X = pd.DataFrame([[distance_km, avg_speed_kmh,
                   now.hour, now.weekday(),
                   traffic_factor, stops_remaining]],
                 columns=FEATURES)
    eta = model.predict(X)[0]
    return round(float(eta), 1)


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[ws] client connected")

    # Send init message with destination
    await websocket.send_text(json.dumps({
        "type": "init",
        "destination": {"lat": DESTINATION[0], "lng": DESTINATION[1]},
    }))

    # Simulate bus moving along route
    wp_idx = 0
    lat, lon = ROUTE_WAYPOINTS[0]
    speed_history: list[float] = []

    try:
        while True:
            if wp_idx >= len(ROUTE_WAYPOINTS) - 1:
                await websocket.send_text(json.dumps({
                    "type": "arrived",
                    "lat": lat, "lng": lon,
                    "eta": 0, "network": "good",
                }))
                break

            wp_idx += 1
            lat, lon = ROUTE_WAYPOINTS[wp_idx]

            now_hour = datetime.now().hour
            is_peak = (8 <= now_hour <= 10) or (17 <= now_hour <= 20)
            base_speed = random.uniform(12, 20) if is_peak else random.uniform(22, 38)
            speed_history.append(base_speed)
            if len(speed_history) > 10:
                speed_history.pop(0)
            avg_speed = float(np.mean(speed_history))

            traffic_factor = round(1 - (avg_speed / 40.0), 2)
            distance_km = total_remaining_distance(wp_idx, lat, lon)
            stops_remaining = max(0, len(ROUTE_WAYPOINTS) - 1 - wp_idx)
            eta = predict_eta(distance_km, avg_speed, traffic_factor, stops_remaining)
            network = network_quality(avg_speed)

            payload = {
                "type": "update",
                "lat": round(lat, 6),
                "lng": round(lon, 6),
                "eta": eta,
                "network": network,
                "debug": {
                    "distance_km": round(distance_km, 2),
                    "avg_speed_kmh": round(avg_speed, 1),
                    "traffic_factor": traffic_factor,
                    "stops_remaining": stops_remaining,
                },
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(SLEEP_INTERVALS[network])

    except WebSocketDisconnect:
        print("[ws] client disconnected")


# ── REST: on-demand ETA prediction ───────────────────────────────────────────

@app.get("/eta")
def get_eta(
    distance_km: float,
    avg_speed_kmh: float,
    traffic_factor: float = 0.3,
    stops_remaining: int = 5,
):
    """
    Quick REST endpoint for ETA prediction.
    Example: GET /eta?distance_km=5&avg_speed_kmh=25
    """
    eta = predict_eta(distance_km, avg_speed_kmh, traffic_factor, stops_remaining)
    return {"eta_minutes": eta}


@app.get("/health")
def health():
    return {"status": "ok"}
