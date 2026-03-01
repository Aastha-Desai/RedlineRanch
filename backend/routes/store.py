import sqlite3
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()
DB_PATH = "health_data.db"


# ── Database setup ────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ecg_sessions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  TEXT UNIQUE,
            start_time  REAL,
            end_time    REAL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ecg_samples (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id   TEXT,
            timestamp    REAL,
            sample_value REAL,
            FOREIGN KEY (session_id) REFERENCES ecg_sessions(session_id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workout_sessions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  TEXT UNIQUE,
            start_time  REAL,
            end_time    REAL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workout_metrics (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id          TEXT,
            timestamp           REAL,
            heart_rate          REAL,
            resting_heart_rate  REAL,
            hrv                 REAL,
            heart_rate_recovery REAL,
            oxygen_saturation   REAL,
            afib_burden         REAL,
            vo2_max             REAL,
            FOREIGN KEY (session_id) REFERENCES workout_sessions(session_id)
        )
    ''')

    # Create a default "live" session for real-time iPhone data
    cursor.execute(
        "INSERT OR IGNORE INTO workout_sessions (session_id, start_time, end_time) VALUES (?, ?, ?)",
        ("live", time.time(), 0)
    )

    conn.commit()
    conn.close()


init_db()


# ── Pydantic models ───────────────────────────────────────────────────────────

class ECGSession(BaseModel):
    session_id: str
    start_time: float
    end_time: float
    samples: List[float]
    sample_rate_hz: Optional[float] = 250.0


class WorkoutMetricSnapshot(BaseModel):
    timestamp: Optional[float] = None
    heart_rate: Optional[float] = None
    resting_heart_rate: Optional[float] = None
    hrv: Optional[float] = None
    heart_rate_recovery: Optional[float] = None
    oxygen_saturation: Optional[float] = None
    afib_burden: Optional[float] = None
    vo2_max: Optional[float] = None


class WorkoutSession(BaseModel):
    session_id: str
    start_time: float
    end_time: float
    metrics: List[WorkoutMetricSnapshot]


# camelCase model to match exactly what the iPhone sends
class HealthKitPayload(BaseModel):
    heartRate: float = None
    hrv: float = None
    oxygenSat: float = None
    restingHeartRate: float = None
    heartRateRecovery: float = None
    afibBurden: float = 0
    vo2Max: float = None


# ── General routes ────────────────────────────────────────────────────────────

@router.get("/store/sessions/all")
def list_all_sessions():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT session_id, start_time, end_time FROM ecg_sessions ORDER BY start_time DESC")
    ecg = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT session_id, start_time, end_time FROM workout_sessions ORDER BY start_time DESC")
    workouts = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"ecg_sessions": ecg, "workout_sessions": workouts}


@router.get("/store/latest")
def get_latest():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM workout_metrics WHERE session_id = 'live' ORDER BY timestamp DESC LIMIT 1"
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="No data yet")
    return dict(row)


# ── ECG routes ────────────────────────────────────────────────────────────────

@router.post("/store/ecg")
def store_ecg(data: ECGSession):
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO ecg_sessions (session_id, start_time, end_time) VALUES (?, ?, ?)",
            (data.session_id, data.start_time, data.end_time)
        )
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Session '{data.session_id}' already exists")

    interval = 1.0 / (data.sample_rate_hz or 250.0)
    rows = [
        (data.session_id, data.start_time + i * interval, value)
        for i, value in enumerate(data.samples)
    ]
    cursor.executemany(
        "INSERT INTO ecg_samples (session_id, timestamp, sample_value) VALUES (?, ?, ?)",
        rows
    )

    conn.commit()
    conn.close()
    return {"status": "ok", "session_id": data.session_id, "samples_stored": len(rows)}


@router.get("/store/ecg/{session_id}")
def get_ecg(session_id: str):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM ecg_sessions WHERE session_id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="ECG session not found")

    cursor.execute(
        "SELECT timestamp, sample_value FROM ecg_samples WHERE session_id = ? ORDER BY timestamp",
        (session_id,)
    )
    samples = [{"timestamp": r["timestamp"], "value": r["sample_value"]} for r in cursor.fetchall()]
    conn.close()

    return {
        "session_id": session_id,
        "start_time": session["start_time"],
        "end_time": session["end_time"],
        "sample_count": len(samples),
        "samples": samples
    }


# ── Workout routes ────────────────────────────────────────────────────────────

@router.post("/store/workout")
def store_workout(data: WorkoutSession):
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO workout_sessions (session_id, start_time, end_time) VALUES (?, ?, ?)",
            (data.session_id, data.start_time, data.end_time)
        )
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Session '{data.session_id}' already exists")

    rows = [
        (
            data.session_id,
            m.timestamp or (data.start_time + i),
            m.heart_rate,
            m.resting_heart_rate,
            m.hrv,
            m.heart_rate_recovery,
            m.oxygen_saturation,
            m.afib_burden,
            m.vo2_max
        )
        for i, m in enumerate(data.metrics)
    ]
    cursor.executemany(
        '''INSERT INTO workout_metrics
           (session_id, timestamp, heart_rate, resting_heart_rate, hrv,
            heart_rate_recovery, oxygen_saturation, afib_burden, vo2_max)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        rows
    )

    conn.commit()
    conn.close()
    return {"status": "ok", "session_id": data.session_id, "snapshots_stored": len(rows)}


@router.get("/store/workout/{session_id}")
def get_workout(session_id: str):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM workout_sessions WHERE session_id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Workout session not found")

    cursor.execute(
        "SELECT * FROM workout_metrics WHERE session_id = ? ORDER BY timestamp",
        (session_id,)
    )
    metrics = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "session_id": session_id,
        "start_time": session["start_time"],
        "end_time": session["end_time"],
        "snapshot_count": len(metrics),
        "metrics": metrics
    }


# ── iPhone live data route ────────────────────────────────────────────────────

@router.post("/store")
def store_healthkit(data: HealthKitPayload):
    if not data.heartRate or data.heartRate <= 0:
        return {"status": "ignored", "reason": "no_active_reading"}

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        '''INSERT INTO workout_metrics
           (session_id, timestamp, heart_rate, resting_heart_rate, hrv,
            heart_rate_recovery, oxygen_saturation, afib_burden, vo2_max)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (
            "live",
            time.time(),
            data.heartRate,
            data.restingHeartRate,
            data.hrv,
            data.heartRateRecovery,
            data.oxygenSat,
            data.afibBurden,
            data.vo2Max
        )
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}


# ── Delete route ──────────────────────────────────────────────────────────────

@router.delete("/store/{session_type}/{session_id}")
def delete_session(session_type: str, session_id: str):
    if session_type not in ("ecg", "workout"):
        raise HTTPException(status_code=400, detail="session_type must be 'ecg' or 'workout'")

    conn = get_db()
    cursor = conn.cursor()

    if session_type == "ecg":
        cursor.execute("DELETE FROM ecg_samples WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM ecg_sessions WHERE session_id = ?", (session_id,))
    else:
        cursor.execute("DELETE FROM workout_metrics WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM workout_sessions WHERE session_id = ?", (session_id,))

    conn.commit()
    conn.close()
    return {"status": "ok", "message": f"{session_type} session '{session_id}' deleted"}