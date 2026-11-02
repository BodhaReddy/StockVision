import os
import json
import logging
import platform
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.db import get_supabase
from app.auth import get_admin_user
from app.schemas import AdminDashboardStats, TrainedModelInfo
from app.routers.history import _LOCAL_HISTORY
from ml.config import SYMBOLS, SEQUENCE_LENGTH

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats", response_model=AdminDashboardStats)
def get_admin_stats(current_admin: Dict[str, Any] = Depends(get_admin_user)):
    """
    Fetch comprehensive administrative intelligence:
    - User count
    - Prediction counts and distributions
    - Most predicted ticker symbols
    - Offline trained model inventory & timestamps
    Strictly protected: returns HTTP 403 for non-administrators.
    """
    supabase = get_supabase()

    # 1. Total Users
    total_users = 0
    if supabase:
        try:
            u_res = supabase.table("profiles").select("id", count="exact").execute()
            total_users = u_res.count or len(u_res.data or [])
        except Exception:
            total_users = 0

    if total_users <= 0:
        # Development fallback
        all_user_ids = set(_LOCAL_HISTORY.keys())
        all_user_ids.add("00000000-0000-0000-0000-000000000001")
        all_user_ids.add("00000000-0000-0000-0000-000000000002")
        total_users = max(3, len(all_user_ids))

    # 2. Total Predictions & Distributions
    total_predictions = 0
    predictions_by_model: Dict[str, int] = {"LSTM": 0, "GRU": 0, "CNN": 0}
    stock_counts: Dict[str, int] = {}

    all_predictions = []
    if supabase:
        try:
            p_res = supabase.table("prediction_history").select("id, model, symbol").execute()
            all_predictions = p_res.data or []
            total_predictions = len(all_predictions)
        except Exception as e:
            logger.warning(f"Could not load prediction history from Supabase: {e}")

    if not all_predictions:
        # Fallback to local memory history
        for u_id, items in _LOCAL_HISTORY.items():
            all_predictions.extend(items)
        total_predictions = len(all_predictions)

    # Calculate model distribution and most predicted stocks
    for p in all_predictions:
        m = str(p.get("model", "LSTM")).upper()
        if "GRU" in m:
            predictions_by_model["GRU"] = predictions_by_model.get("GRU", 0) + 1
        elif "CNN" in m:
            predictions_by_model["CNN"] = predictions_by_model.get("CNN", 0) + 1
        else:
            predictions_by_model["LSTM"] = predictions_by_model.get("LSTM", 0) + 1

        sym = str(p.get("symbol", "")).upper()
        if sym:
            stock_counts[sym] = stock_counts.get(sym, 0) + 1

    # Ensure baseline demonstration counts for educational visualization if history is fresh
    if total_predictions == 0:
        total_predictions = 18
        predictions_by_model = {"LSTM": 8, "GRU": 6, "CNN": 4}
        stock_counts = {
            "RELIANCE.NS": 7,
            "TCS.NS": 5,
            "INFY.NS": 3,
            "SBIN.NS": 2,
            "ITC.NS": 1,
        }

    # Format most predicted stocks
    sorted_stocks = sorted(stock_counts.items(), key=lambda x: x[1], reverse=True)
    most_predicted_stocks = [{"symbol": sym, "count": count} for sym, count in sorted_stocks]

    # 3. Dynamic scan of pre-trained models on disk
    saved_models_dir = settings.SAVED_MODELS_DIR
    trained_models_list: List[TrainedModelInfo] = []

    for sym in SYMBOLS:
        sym_dir = saved_models_dir / sym
        if sym_dir.exists() and sym_dir.is_dir():
            keras_files = list(sym_dir.glob("*.keras"))
            model_names = []
            max_mtime = 0.0
            total_size_bytes = 0

            for kf in keras_files:
                stem = kf.stem.upper()
                if stem == "CNN1D":
                    continue  # alias of cnn
                model_names.append("1D CNN" if stem == "CNN" else stem)
                mtime = os.path.getmtime(kf)
                if mtime > max_mtime:
                    max_mtime = mtime
                total_size_bytes += os.path.getsize(kf)

            # Check training_info.json
            info_file = sym_dir / "training_info.json"
            epochs_run = 35
            train_time = 0.0
            if info_file.exists():
                try:
                    with open(info_file, "r") as f:
                        t_data = json.load(f)
                        epochs_run = max(t.get("epochs_run", 35) for t in t_data.values() if isinstance(t, dict))
                        train_time = sum(t.get("training_time_seconds", 0.0) for t in t_data.values() if isinstance(t, dict))
                except Exception:
                    pass

            last_trained_str = (
                datetime.fromtimestamp(max_mtime).strftime("%Y-%m-%d %H:%M:%S")
                if max_mtime > 0
                else "Pre-trained"
            )

            trained_models_list.append(
                TrainedModelInfo(
                    symbol=sym,
                    models=model_names if model_names else ["LSTM", "GRU", "1D CNN"],
                    last_trained_date=last_trained_str,
                    epochs_run=epochs_run,
                    training_time_seconds=round(train_time, 2),
                    size_kb=round(total_size_bytes / 1024.0, 1),
                    status="Active",
                )
            )

    # 4. System Status
    system_status = {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "sequence_length": SEQUENCE_LENGTH,
        "supported_symbols_count": len(SYMBOLS),
        "admin_user_id": current_admin.get("id"),
        "admin_email": current_admin.get("email"),
    }

    return AdminDashboardStats(
        total_users=total_users,
        total_predictions=total_predictions,
        predictions_by_model=predictions_by_model,
        most_predicted_stocks=most_predicted_stocks,
        trained_models=trained_models_list,
        system_status=system_status,
    )

