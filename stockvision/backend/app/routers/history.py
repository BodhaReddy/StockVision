import logging
import uuid
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user
from app.db import get_supabase
from app.config import settings
from app.schemas import PredictionHistoryItem, UserProfileResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["history_and_profile"])

# Persistent local history file on disk so records survive restarts and RLS fallbacks
HISTORY_FILE = settings.SAVED_MODELS_DIR / "prediction_history.json"

def _load_local_history() -> Dict[str, List[Dict[str, Any]]]:
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            logger.warning(f"Failed to read local prediction history file: {e}")
    return {}

def _save_local_history(history_data: Dict[str, List[Dict[str, Any]]]):
    try:
        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history_data, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to persist local prediction history file: {e}")

_LOCAL_HISTORY: Dict[str, List[Dict[str, Any]]] = _load_local_history()

def record_prediction(
    user_id: str,
    symbol: str,
    model: str,
    horizon: int,
    latest_price: float,
    predicted_prices: List[Dict[str, Any]],
    user_token: Optional[str] = None,
):
    """Automatically record prediction to local persistent storage and Supabase table."""
    record_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat()
    record = {
        "id": record_id,
        "user_id": user_id,
        "symbol": symbol,
        "model": model,
        "horizon": horizon,
        "latest_price": float(latest_price),
        "predicted_prices": predicted_prices,
        "created_at": now_iso,
    }

    # 1. Always save locally first so prediction records are NEVER lost
    if user_id not in _LOCAL_HISTORY:
        _LOCAL_HISTORY[user_id] = []
    _LOCAL_HISTORY[user_id].insert(0, record)
    _save_local_history(_LOCAL_HISTORY)
    logger.info(f"Recorded prediction for user {user_id} and symbol {symbol} locally.")

    # 2. Also try recording to Supabase if configured
    supabase = get_supabase()
    if supabase:
        try:
            if user_token and not user_token.startswith("demo-"):
                supabase.postgrest.headers["Authorization"] = f"Bearer {user_token}"
            supabase.table("prediction_history").insert(record).execute()
            logger.info(f"Recorded prediction for user {user_id} and symbol {symbol} in Supabase.")
        except Exception as e:
            logger.warning(f"Failed to record prediction in Supabase: {e}. Preserved in local storage.")

@router.get("/history", response_model=List[PredictionHistoryItem])
def get_prediction_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    user_token = current_user.get("token")
    supabase = get_supabase()

    raw_records: List[Dict[str, Any]] = []

    if supabase:
        try:
            if user_token and not user_token.startswith("demo-"):
                supabase.postgrest.headers["Authorization"] = f"Bearer {user_token}"
            res = (
                supabase.table("prediction_history")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(100)
                .execute()
            )
            raw_records = res.data or []
        except Exception as e:
            logger.warning(f"Supabase query failed for history: {e}. Falling back to local records.")
            raw_records = []

    # Merge with local persistent storage so records never disappear on RLS mismatches
    local_recs = _LOCAL_HISTORY.get(user_id, [])
    seen_ids = set()
    combined_records: List[Dict[str, Any]] = []

    for r in raw_records:
        rid = str(r.get("id"))
        if rid and rid not in seen_ids:
            seen_ids.add(rid)
            combined_records.append(r)

    for r in local_recs:
        rid = str(r.get("id"))
        if rid and rid not in seen_ids:
            seen_ids.add(rid)
            combined_records.append(r)

    # Sort descending by creation timestamp
    combined_records.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)

    items: List[PredictionHistoryItem] = []
    for r in combined_records:
        preds = r.get("predicted_prices") or []
        latest_p = float(r.get("latest_price", 0.0))
        final_p = latest_p
        if isinstance(preds, list) and len(preds) > 0:
            final_p = float(preds[-1].get("predicted_close", latest_p))
        elif isinstance(preds, dict):
            final_p = float(preds.get("predicted_close", latest_p))

        change = round(final_p - latest_p, 2)
        pct = round((change / latest_p * 100.0) if latest_p > 0 else 0.0, 2)
        direction = "UP" if change > 0.05 else ("DOWN" if change < -0.05 else "FLAT")

        items.append(
            PredictionHistoryItem(
                id=str(r.get("id")),
                user_id=str(r.get("user_id")),
                symbol=str(r.get("symbol")),
                model=str(r.get("model")),
                horizon=int(r.get("horizon", 5)),
                latest_price=latest_p,
                predicted_prices=preds if isinstance(preds, list) else [preds],
                final_predicted_price=final_p,
                expected_change=change,
                expected_change_pct=pct,
                direction=direction,
                created_at=str(r.get("created_at", "")),
            )
        )

    return items

@router.delete("/history/{id}")
def delete_prediction_history_item(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user["id"]
    user_token = current_user.get("token")
    supabase = get_supabase()

    if supabase:
        try:
            if user_token and not user_token.startswith("demo-"):
                supabase.postgrest.headers["Authorization"] = f"Bearer {user_token}"
            supabase.table("prediction_history").delete().eq("id", id).eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Failed to delete prediction from Supabase: {e}")

    if user_id in _LOCAL_HISTORY:
        _LOCAL_HISTORY[user_id] = [x for x in _LOCAL_HISTORY[user_id] if str(x.get("id")) != str(id)]
        _save_local_history(_LOCAL_HISTORY)

    return {"status": "deleted", "id": id}

@router.get("/profile", response_model=UserProfileResponse)
def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    user_token = current_user.get("token")
    email = current_user.get("email", "user@stockvision.edu")

    saved_count = 0
    predictions_count = 0
    supabase = get_supabase()

    if supabase:
        try:
            if user_token and not user_token.startswith("demo-"):
                supabase.postgrest.headers["Authorization"] = f"Bearer {user_token}"
            w_res = supabase.table("watchlists").select("id", count="exact").eq("user_id", user_id).execute()
            saved_count = w_res.count or len(w_res.data or [])
        except Exception:
            saved_count = 0

        try:
            if user_token and not user_token.startswith("demo-"):
                supabase.postgrest.headers["Authorization"] = f"Bearer {user_token}"
            p_res = supabase.table("prediction_history").select("id", count="exact").eq("user_id", user_id).execute()
            predictions_count = p_res.count or len(p_res.data or [])
        except Exception:
            predictions_count = 0

    from app.routers.watchlist import _LOCAL_WATCHLISTS
    local_saved = len(_LOCAL_WATCHLISTS.get(user_id, []))
    local_preds = len(_LOCAL_HISTORY.get(user_id, []))

    saved_count = max(saved_count, local_saved)
    predictions_count = max(predictions_count, local_preds)

    return UserProfileResponse(
        id=user_id,
        email=email,
        is_admin=current_user.get("is_admin", False),
        saved_stocks_count=saved_count,
        predictions_count=predictions_count,
    )
