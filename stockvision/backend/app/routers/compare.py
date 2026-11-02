import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from app.config import settings
from app.schemas import ModelComparisonResponse

router = APIRouter(prefix="", tags=["comparison"])

@router.get("/compare/{symbol}", response_model=ModelComparisonResponse)
def compare_models(symbol: str):
    clean_sym = symbol.strip().upper()
    metrics_file = settings.SAVED_MODELS_DIR / clean_sym / "metrics.json"

    if not metrics_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Predictions are not available for this stock yet"
        )

    try:
        with open(metrics_file, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load comparison metrics: {str(e)}"
        )
