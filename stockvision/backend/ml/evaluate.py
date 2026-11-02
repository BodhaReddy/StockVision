import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import json
import logging
from pathlib import Path
from typing import Dict, Any, List
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import mean_absolute_error, mean_squared_error

from ml.config import (
    SYMBOLS,
    SAVED_MODELS_DIR,
    DATA_PERIOD,
    FEATURE_COLS,
    SEQUENCE_LENGTH
)
from ml.train import fetch_historical_data, prepare_dataset

# Setup logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def compute_mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Mean Absolute Percentage Error."""
    mask = actual != 0
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100.0)

def compute_directional_accuracy(actual: np.ndarray, predicted: np.ndarray, prev_actual: np.ndarray) -> float:
    """
    Directional Accuracy (%): Measures whether the sign of predicted price change
    matches the actual sign of price change relative to previous day's close.
    """
    actual_direction = np.sign(actual - prev_actual)
    predicted_direction = np.sign(predicted - prev_actual)
    matches = (actual_direction == predicted_direction)
    return float(np.mean(matches) * 100.0)

def evaluate_symbol_models(symbol: str, saved_dir: Path = SAVED_MODELS_DIR) -> Dict[str, Any]:
    """Evaluate saved LSTM, GRU, CNN models and Naive baseline against the test set."""
    symbol_dir = saved_dir / symbol
    if not symbol_dir.exists():
        raise FileNotFoundError(f"Model directory for {symbol} not found at {symbol_dir}")

    scaler_data = joblib.load(symbol_dir / "scaler.joblib")
    target_scaler = scaler_data["target_scaler"]

    # Load test split
    df = fetch_historical_data(symbol, period=DATA_PERIOD)
    _, _, _, _, X_test, y_test, _, _, test_dates = prepare_dataset(df)

    # Invert actual test close prices
    actual_test_close = target_scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
    
    # Previous day actual prices to calculate directional accuracy and naive baseline
    # X_test[i, -1, 3] corresponds to the normalized Close of day (t-1)
    prev_close_normalized = X_test[:, -1, 3].reshape(-1, 1)
    prev_close_actual = target_scaler.inverse_transform(prev_close_normalized).flatten()

    # Load training timing metadata if present
    training_info = {}
    info_file = symbol_dir / "training_info.json"
    if info_file.exists():
        with open(info_file, "r") as f:
            training_info = json.load(f)

    results: Dict[str, Any] = {}
    test_predictions: Dict[str, np.ndarray] = {}

    # 1. Evaluate Deep Learning Models
    for model_name in ["lstm", "gru", "cnn"]:
        model_file = symbol_dir / f"{model_name}.keras"
        # Support fallback to cnn1d.keras if cnn.keras is absent
        if not model_file.exists() and model_name == "cnn":
            model_file = symbol_dir / "cnn1d.keras"

        if not model_file.exists():
            logger.warning(f"Model {model_file} not found for {symbol}, skipping...")
            continue

        model = tf.keras.models.load_model(str(model_file))
        preds_scaled = model.predict(X_test, verbose=0)
        preds_actual = target_scaler.inverse_transform(preds_scaled).flatten()
        test_predictions[model_name] = preds_actual

        mae = float(mean_absolute_error(actual_test_close, preds_actual))
        rmse = float(np.sqrt(mean_squared_error(actual_test_close, preds_actual)))
        mape = compute_mape(actual_test_close, preds_actual)
        dir_acc = compute_directional_accuracy(actual_test_close, preds_actual, prev_close_actual)
        train_time = training_info.get(model_name, {}).get("training_time_seconds", 0.0)

        results[model_name] = {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "mape": round(mape, 2),
            "directional_accuracy": round(dir_acc, 2),
            "training_time_seconds": round(train_time, 2)
        }

    # 2. Evaluate Naive Baseline ("Tomorrow's close = Today's close", i.e. pred_t = actual_{t-1})
    naive_preds = prev_close_actual
    test_predictions["naive_baseline"] = naive_preds
    naive_mae = float(mean_absolute_error(actual_test_close, naive_preds))
    naive_rmse = float(np.sqrt(mean_squared_error(actual_test_close, naive_preds)))
    naive_mape = compute_mape(actual_test_close, naive_preds)
    naive_dir_acc = 50.0  # Random walk expectation when predicting 0 delta

    results["naive_baseline"] = {
        "mae": round(naive_mae, 2),
        "rmse": round(naive_rmse, 2),
        "mape": round(naive_mape, 2),
        "directional_accuracy": round(naive_dir_acc, 2),
        "training_time_seconds": 0.0
    }

    # 3. Determine best model per metric
    candidate_keys = list(results.keys())
    best_mae_model = min(candidate_keys, key=lambda k: results[k]["mae"])
    best_rmse_model = min(candidate_keys, key=lambda k: results[k]["rmse"])
    best_mape_model = min(candidate_keys, key=lambda k: results[k]["mape"])
    best_dir_model = max(candidate_keys, key=lambda k: results[k]["directional_accuracy"])

    # Build test chart overlay data (Actual vs predicted for all models across test dates)
    chart_data = []
    num_test_points = len(actual_test_close)
    # Use matching dates or generate synthetic relative date sequence if length mismatch
    dates_list = test_dates[-num_test_points:] if len(test_dates) >= num_test_points else [f"T+{i}" for i in range(num_test_points)]
    
    for i in range(num_test_points):
        row = {
            "date": dates_list[i],
            "actual": round(float(actual_test_close[i]), 2),
            "naive": round(float(naive_preds[i]), 2),
        }
        for m_name in ["lstm", "gru", "cnn"]:
            if m_name in test_predictions:
                row[m_name] = round(float(test_predictions[m_name][i]), 2)
        chart_data.append(row)

    summary = {
        "symbol": symbol,
        "metrics": results,
        "best_models": {
            "mae": best_mae_model,
            "rmse": best_rmse_model,
            "mape": best_mape_model,
            "directional_accuracy": best_dir_model
        },
        "test_chart_data": chart_data,
        "disclaimer": "Experimental forecasts for educational use, not investment advice."
    }

    # Save to metrics.json
    metrics_path = symbol_dir / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(summary, f, indent=2)
    logger.info(f"Evaluation metrics saved to {metrics_path}")

    # 4. Upsert into Supabase model_performance table if configured
    try:
        from app.db import get_supabase
        supabase = get_supabase()
        if supabase:
            for m_name, m_vals in results.items():
                record = {
                    "symbol": symbol,
                    "model": m_name,
                    "mae": m_vals["mae"],
                    "rmse": m_vals["rmse"],
                    "mape": m_vals["mape"],
                    "directional_accuracy": m_vals["directional_accuracy"],
                    "training_time_seconds": m_vals.get("training_time_seconds", 0.0),
                }
                supabase.table("model_performance").upsert(record, on_conflict="symbol,model").execute()
            logger.info(f"Successfully upserted metrics for {symbol} into Supabase model_performance table.")
    except Exception as e:
        logger.info(f"Supabase upsert skipped: {e}")

    return summary

if __name__ == "__main__":
    for sym in SYMBOLS:
        print(f"\nEvaluating models for {sym}...")
        try:
            res = evaluate_symbol_models(sym, SAVED_MODELS_DIR)
            print(f"Metrics evaluated for {sym}: {list(res['metrics'].keys())}")
        except Exception as e:
            print(f"Error evaluating {sym}: {e}")
