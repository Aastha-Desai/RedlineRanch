from fastapi import APIRouter, HTTPException
import numpy as np
import os

router = APIRouter(prefix="/ecg", tags=["analyze"])

import tensorflow as tf
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../trained_model/ecg_model.keras")
model = tf.keras.models.load_model(MODEL_PATH)

CLASS_LABELS = ["Normal", "Supraventricular", "Ventricular", "Fusion", "Unknown"]

def preprocess(samples: list[dict], target_len: int = 187) -> np.ndarray:
    values = np.array([s["v"] for s in samples], dtype=np.float32)
    
    # Resample to 187 points
    indices = np.linspace(0, len(values) - 1, target_len)
    values = np.interp(indices, np.arange(len(values)), values)
    
    # Scale to match MIT-BIH training range (0 to ~4)
    v_min, v_max = values.min(), values.max()
    if v_max - v_min > 0:
        values = (values - v_min) / (v_max - v_min) * 4.0
    
    return values.reshape(1, target_len, 1)

@router.post("/analyze/{session_id}")
async def analyze_session(session_id: str, body: dict):
    samples = body.get("samples", [])
    print(f"Got {len(samples)} samples")

    if not samples:
        raise HTTPException(status_code=400, detail="No samples provided")

    print("Preprocessing...")
    x = preprocess(samples)
    print(f"Input shape: {x.shape}")

    print("Running model.predict...")
    preds = model.predict(x)[0]
    print(f"Predictions: {preds}")

    results = [
        {"label": CLASS_LABELS[i], "confidence": round(float(preds[i]), 4)}
        for i in range(len(CLASS_LABELS))
    ]
    results.sort(key=lambda r: r["confidence"], reverse=True)

    print(f"Returning: {results[0]}")
    return {
        "session_id": session_id,
        "prediction": results[0]["label"],
        "confidence": results[0]["confidence"],
        "all_scores": results,
    }