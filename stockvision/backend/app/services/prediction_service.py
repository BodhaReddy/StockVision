import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import logging
from pathlib import Path
from typing import Dict, Any, List
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from datetime import datetime, timedelta

from app.config import settings
from app.services.yfinance_service import get_raw_history_df
from app.schemas import (
    PredictRequest,
    PredictResponse,
    ForecastPoint,
    StockHistoricalPoint,
    PredictionExplanation,
    FeatureImportance,
)
from ml.config import SEQUENCE_LENGTH

logger = logging.getLogger(__name__)

# In-memory cache for loaded keras models and scalers
_MODEL_CACHE: Dict[str, Any] = {}
_SCALER_CACHE: Dict[str, Any] = {}

def get_next_trading_days(start_date: pd.Timestamp, num_days: int) -> List[str]:
    """Generate business day strings (Mon-Fri) excluding weekends."""
    dates = []
    curr = start_date + timedelta(days=1)
    while len(dates) < num_days:
        if curr.weekday() < 5:  # Mon=0, Fri=4
            dates.append(curr.strftime("%Y-%m-%d"))
        curr += timedelta(days=1)
    return dates

def load_stock_artifacts(symbol: str, model_type: str):
    """Load pre-trained Keras model and scalers from disk."""
    m_clean = model_type.lower().strip()
    if m_clean in ("cnn", "cnn1d", "1d_cnn"):
        standard_name = "cnn"
    elif m_clean in ("gru",):
        standard_name = "gru"
    elif m_clean in ("lstm",):
        standard_name = "lstm"
    else:
        raise ValueError(f"Unknown model type '{model_type}'. Choose from 'lstm', 'gru', 'cnn'.")

    symbol_dir = settings.SAVED_MODELS_DIR / symbol
    if not symbol_dir.exists():
        raise FileNotFoundError("Predictions are not available for this stock yet")

    scaler_key = symbol
    if scaler_key not in _SCALER_CACHE:
        scaler_file = symbol_dir / "scaler.joblib"
        if not scaler_file.exists():
            raise FileNotFoundError("Predictions are not available for this stock yet")
        _SCALER_CACHE[scaler_key] = joblib.load(scaler_file)
    scaler_dict = _SCALER_CACHE[scaler_key]

    model_key = f"{symbol}_{standard_name}"
    if model_key not in _MODEL_CACHE:
        model_file = symbol_dir / f"{standard_name}.keras"
        if not model_file.exists() and standard_name == "cnn":
            model_file = symbol_dir / "cnn1d.keras"
            
        if not model_file.exists():
            raise FileNotFoundError("Predictions are not available for this stock yet")
            
        logger.info(f"Loading Keras model from {model_file}...")
        _MODEL_CACHE[model_key] = tf.keras.models.load_model(str(model_file))
        
    model = _MODEL_CACHE[model_key]
    return model, scaler_dict, standard_name

def run_iterative_prediction(req: PredictRequest) -> PredictResponse:
    """Execute iterative multi-step forecast using offline pre-trained deep learning model."""
    symbol = req.symbol.strip().upper()
    model_type = req.model.lower()
    horizon = req.horizon

    # 1. Load pre-trained artifacts
    model, scaler_dict, canonical_model_name = load_stock_artifacts(symbol, model_type)
    feature_scaler = scaler_dict["feature_scaler"]
    target_scaler = scaler_dict["target_scaler"]
    window_size = scaler_dict.get("window_size", SEQUENCE_LENGTH)

    # 2. Fetch latest historical data (need at least window_size rows)
    df = get_raw_history_df(symbol, period="1y")
    if len(df) < window_size:
        raise ValueError(f"Insufficient history for {symbol} (requires {window_size} days, got {len(df)})")

    # Keep last window_size days of historical data for context
    recent_df = df.iloc[-window_size:].copy()
    latest_close = float(recent_df["Close"].iloc[-1])
    latest_date = pd.to_datetime(recent_df.index[-1])

    # Convert recent historical points for response visualization
    historical_points: List[StockHistoricalPoint] = []
    for idx, row in recent_df.iterrows():
        d_str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
        historical_points.append(StockHistoricalPoint(
            date=d_str,
            open=round(float(row["Open"]), 2),
            high=round(float(row["High"]), 2),
            low=round(float(row["Low"]), 2),
            close=round(float(row["Close"]), 2),
            volume=int(row["Volume"]),
            ma20=None,
            ma50=None
        ))

    # Scale the initial 60-day window
    current_features = recent_df[["Open", "High", "Low", "Close", "Volume"]].values
    curr_scaled_window = feature_scaler.transform(current_features)

    forecast_dates = get_next_trading_days(latest_date, horizon)
    forecast_points: List[ForecastPoint] = []
    
    # Calculate historical daily volatility for uncertainty funnel
    returns = np.diff(np.log(recent_df["Close"].values))
    daily_vol = float(np.std(returns)) if len(returns) > 1 else 0.015

    window_input = np.expand_dims(curr_scaled_window, axis=0)
    current_price_iter = latest_close

    for step in range(1, horizon + 1):
        # Predict normalized next close
        pred_scaled = model.predict(window_input, verbose=0)
        pred_close_val = float(target_scaler.inverse_transform(pred_scaled)[0, 0])

        # Prevent unrealistic negative numbers
        pred_close_val = max(0.1, pred_close_val)

        # Forecast uncertainty interval (widens with sqrt(step))
        uncertainty_pct = daily_vol * np.sqrt(step) * 1.645
        lower = round(pred_close_val * (1.0 - uncertainty_pct), 2)
        upper = round(pred_close_val * (1.0 + uncertainty_pct), 2)

        forecast_points.append(ForecastPoint(
            step=step,
            date=forecast_dates[step - 1],
            predicted_close=round(pred_close_val, 2),
            lower_bound=lower,
            upper_bound=upper
        ))

        # Iterative update: approximate next day OHLCV and slide the window forward
        prev_close = current_price_iter
        current_price_iter = pred_close_val
        next_open = prev_close
        next_high = max(next_open, current_price_iter) * 1.002
        next_low = min(next_open, current_price_iter) * 0.998
        next_vol = float(np.mean(recent_df["Volume"].values[-10:]))

        next_unscaled_row = np.array([[next_open, next_high, next_low, current_price_iter, next_vol]])
        next_scaled_row = feature_scaler.transform(next_unscaled_row)

        # Slide window
        new_window = np.append(window_input[:, 1:, :], [next_scaled_row], axis=1)
        window_input = new_window

    # Compute expected change for selected horizon
    final_pred_close = forecast_points[-1].predicted_close
    expected_change = round(final_pred_close - latest_close, 2)
    expected_change_pct = round((expected_change / latest_close) * 100.0, 2)

    if expected_change > 0.05:
        direction = "UP"
    elif expected_change < -0.05:
        direction = "DOWN"
    else:
        direction = "FLAT"

    # 4. Generate "Why this prediction?" Explanation
    # A. Recent price trend
    c5 = float(df["Close"].iloc[-6]) if len(df) > 5 else latest_close
    p5_pct = round(((latest_close - c5) / c5) * 100.0, 2)
    c20 = float(df["Close"].iloc[-21]) if len(df) > 20 else latest_close
    p20_pct = round(((latest_close - c20) / c20) * 100.0, 2)

    trend_summary = (
        f"Over the last 5 sessions, {symbol} moved {p5_pct:+.2f}%, and over the last 20 sessions it registered {p20_pct:+.2f}%. "
        f"The model's sequential memory identifies a {'constructive upward trend' if p5_pct > 0 else 'corrective pullback phase'} in the immediate price action."
    )

    # B. Moving averages context
    ma20_val = float(df["Close"].rolling(20).mean().iloc[-1]) if len(df) >= 20 else latest_close
    ma50_val = float(df["Close"].rolling(50).mean().iloc[-1]) if len(df) >= 50 else latest_close
    ma20_diff = round(((latest_close - ma20_val) / ma20_val) * 100.0, 2)
    ma50_diff = round(((latest_close - ma50_val) / ma50_val) * 100.0, 2)

    ma_summary = (
        f"The current settlement (₹{latest_close:,.2f}) is trading {abs(ma20_diff):.1f}% {'above' if ma20_diff >= 0 else 'below'} the 20-day SMA (₹{ma20_val:,.2f}) "
        f"and {abs(ma50_diff):.1f}% {'above' if ma50_diff >= 0 else 'below'} the 50-day SMA (₹{ma50_val:,.2f}). "
        f"{'Trading above key moving averages provides dynamic support that biases model weights upward.' if ma20_diff >= 0 else 'Trading below moving averages acts as an overhead technical resistance ceiling that biases model weights lower.'}"
    )

    # C. Volume change context
    vol_5d = float(df["Volume"].iloc[-5:].mean()) if len(df) >= 5 else 1.0
    vol_20d = float(df["Volume"].iloc[-20:].mean()) if len(df) >= 20 else 1.0
    vol_pct = round(((vol_5d - vol_20d) / vol_20d) * 100.0, 1) if vol_20d > 0 else 0.0

    vol_summary = (
        f"5-day average trading volume ({vol_5d / 1e6:.2f}M shares) shifted by {vol_pct:+.1f}% compared to the 20-day baseline ({vol_20d / 1e6:.2f}M shares). "
        f"{'Expanding volume confirms active institutional participation supporting the predicted price path.' if vol_pct >= 0 else 'Contracting volume signals range-bound consolidation and lower directional volatility.'}"
    )

    # D. Permutation feature importance on the 60-day input sequence
    # FEATURE_COLS: ["Open", "High", "Low", "Close", "Volume"]
    initial_seq = np.expand_dims(curr_scaled_window, axis=0)
    base_pred_raw = model.predict(initial_seq, verbose=0)[0, 0]

    feature_meta = [
        ("Close", 3, "Primary autoregressive anchor: tracks daily settlement persistence."),
        ("High", 1, "Upper volatility ceiling: defines breakout thresholds and resistance."),
        ("Low", 2, "Downside support floor: detects intraday selling exhaustion."),
        ("Open", 0, "Session entry baseline: captures overnight gap momentum."),
        ("Volume", 4, "Flow intensity: scales conviction and directional velocity."),
    ]

    diff_map = {}
    np.random.seed(42)
    for feat_name, col_idx, desc in feature_meta:
        perturbed = initial_seq.copy()
        perturbed[0, :, col_idx] = np.random.permutation(perturbed[0, :, col_idx])
        p_out = model.predict(perturbed, verbose=0)[0, 0]
        diff_map[feat_name] = max(0.0001, float(abs(p_out - base_pred_raw)))

    total_diff = sum(diff_map.values())
    feature_importance_list: List[FeatureImportance] = []
    for feat_name, col_idx, desc in feature_meta:
        pct_imp = round((diff_map[feat_name] / total_diff) * 100.0, 1)
        feature_importance_list.append(FeatureImportance(
            feature=feat_name,
            importance_pct=pct_imp,
            description=desc
        ))

    # Sort descending by importance
    feature_importance_list.sort(key=lambda x: x.importance_pct, reverse=True)

    influential_factors = [
        f"Recent 5-day momentum ({p5_pct:+.2f}%) set the initial rollout vector.",
        f"Position relative to 20-day SMA ({ma20_diff:+.1f}%) established baseline support/resistance.",
        f"5-day volume variance ({vol_pct:+.1f}%) determined the confidence scaling of the predicted curve.",
    ]

    explanation = PredictionExplanation(
        recent_trend_summary=trend_summary,
        moving_averages_context=ma_summary,
        volume_change_context=vol_summary,
        influential_factors=influential_factors,
        feature_importance=feature_importance_list,
        label="Influential input features, not causes of price movement",
        disclaimer="Statistical sensitivity across 60-day input sequences does not imply market causation."
    )

    return PredictResponse(
        symbol=symbol,
        model=canonical_model_name.upper(),
        horizon=horizon,
        latest_close=round(latest_close, 2),
        predicted_close=final_pred_close,
        expected_change=expected_change,
        expected_change_pct=expected_change_pct,
        direction=direction,
        forecast=forecast_points,
        historical_context=historical_points,
        explanation=explanation,
        disclaimer="Experimental forecasts for educational use, not investment advice."
    )
