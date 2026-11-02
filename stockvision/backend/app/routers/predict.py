from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas import PredictRequest, PredictResponse
from app.services.prediction_service import run_iterative_prediction
from app.auth import get_optional_user
from app.routers.history import record_prediction

router = APIRouter(prefix="", tags=["prediction"])

@router.post("/predict", response_model=PredictResponse)
def predict(
    req: PredictRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    try:
        result = run_iterative_prediction(req)
        
        # Automatically save prediction if authenticated
        if current_user and current_user.get("id"):
            try:
                forecast_dicts = [
                    {
                        "step": f.step,
                        "date": f.date,
                        "predicted_close": f.predicted_close,
                        "lower_bound": f.lower_bound,
                        "upper_bound": f.upper_bound,
                    }
                    for f in result.forecast
                ]
                record_prediction(
                    user_id=current_user["id"],
                    symbol=result.symbol,
                    model=result.model,
                    horizon=result.horizon,
                    latest_price=result.latest_close,
                    predicted_prices=forecast_dicts,
                    user_token=current_user.get("token"),
                )
            except Exception as e:
                # Do not fail prediction output if logging fails
                pass

        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Predictions are not available for this stock yet"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction inference failed: {str(e)}"
        )
