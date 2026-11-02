import logging
import uuid
import json
from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user
from app.db import get_supabase
from app.config import settings
from app.schemas import WatchlistAddRequest, WatchlistItem
from app.services.yfinance_service import get_stock_summary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

# Persistent local watchlists file on disk
WATCHLIST_FILE = settings.SAVED_MODELS_DIR / "watchlists.json"

def _load_local_watchlists() -> Dict[str, List[Dict[str, Any]]]:
    if WATCHLIST_FILE.exists():
        try:
            with open(WATCHLIST_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            logger.warning(f"Failed to read local watchlists file: {e}")
    return {}

def _save_local_watchlists(data: Dict[str, List[Dict[str, Any]]]):
    try:
        WATCHLIST_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(WATCHLIST_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save local watchlists file: {e}")

_LOCAL_WATCHLISTS: Dict[str, List[Dict[str, Any]]] = _load_local_watchlists()

@router.get("", response_model=List[WatchlistItem])
def get_user_watchlist(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    user_token = current_user.get("token")
    supabase = get_supabase()

    symbols_records: List[Dict[str, Any]] = []

    if supabase:
        try:
            if user_token and not user_token.startswith("demo-"):
                supabase.postgrest.headers["Authorization"] = f"Bearer {user_token}"
            res = (
                supabase.table("watchlists")
                .select("id, symbol, created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            symbols_records = res.data or []
        except Exception as e:
            logger.warning(f"Failed to query Supabase watchlists table: {e}. Falling back to session memory.")
            symbols_records = []

    # Merge with local persistent watchlists
    local_recs = _LOCAL_WATCHLISTS.get(user_id, [])
    seen_syms = set()
    combined_records: List[Dict[str, Any]] = []

    for rec in symbols_records:
        sym = rec.get("symbol", "").upper()
        if sym and sym not in seen_syms:
            seen_syms.add(sym)
            combined_records.append(rec)

    for rec in local_recs:
        sym = rec.get("symbol", "").upper()
        if sym and sym not in seen_syms:
            seen_syms.add(sym)
            combined_records.append(rec)

    items: List[WatchlistItem] = []
    for rec in combined_records:
        sym = rec["symbol"]
        try:
            summary = get_stock_summary(sym)
            items.append(
                WatchlistItem(
                    id=str(rec.get("id", sym)),
                    symbol=sym,
                    name=summary.name,
                    current_price=summary.current_price,
                    change=summary.change,
                    percent_change=summary.percent_change,
                    created_at=str(rec.get("created_at", datetime.utcnow().isoformat())),
                )
            )
        except Exception as e:
            logger.warning(f"Error fetching summary for watchlist symbol {sym}: {e}")
            items.append(
                WatchlistItem(
                    id=str(rec.get("id", sym)),
                    symbol=sym,
                    name=sym,
                    current_price=0.0,
                    change=0.0,
                    percent_change=0.0,
                    created_at=str(rec.get("created_at", datetime.utcnow().isoformat())),
                )
            )

    return items

@router.post("", status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    req: WatchlistAddRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user["id"]
    user_token = current_user.get("token")
    sym = req.symbol.strip().upper()
    supabase = get_supabase()

    # 1. Always store locally first
    if user_id not in _LOCAL_WATCHLISTS:
        _LOCAL_WATCHLISTS[user_id] = []
    if not any(x["symbol"] == sym for x in _LOCAL_WATCHLISTS[user_id]):
        _LOCAL_WATCHLISTS[user_id].append({
            "id": str(uuid.uuid4()),
            "symbol": sym,
            "created_at": datetime.utcnow().isoformat(),
        })
        _save_local_watchlists(_LOCAL_WATCHLISTS)

    # 2. Also try Supabase if available
    if supabase:
        try:
            if user_token and not user_token.startswith("demo-"):
                supabase.postgrest.headers["Authorization"] = f"Bearer {user_token}"
            supabase.table("watchlists").upsert(
                {"user_id": user_id, "symbol": sym},
                on_conflict="user_id,symbol",
            ).execute()
        except Exception as e:
            logger.warning(f"Failed to insert into Supabase watchlists: {e}. Preserved in local storage.")

    return {"status": "added", "symbol": sym}

@router.delete("/{symbol}")
def remove_from_watchlist(
    symbol: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user["id"]
    user_token = current_user.get("token")
    sym = symbol.strip().upper()
    supabase = get_supabase()

    if supabase:
        try:
            if user_token and not user_token.startswith("demo-"):
                supabase.postgrest.headers["Authorization"] = f"Bearer {user_token}"
            supabase.table("watchlists").delete().eq("user_id", user_id).eq("symbol", sym).execute()
        except Exception as e:
            logger.warning(f"Failed to delete from Supabase watchlists: {e}")

    if user_id in _LOCAL_WATCHLISTS:
        _LOCAL_WATCHLISTS[user_id] = [x for x in _LOCAL_WATCHLISTS[user_id] if x["symbol"] != sym]
        _save_local_watchlists(_LOCAL_WATCHLISTS)

    return {"status": "removed", "symbol": sym}
