import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import time
import json
import logging
from pathlib import Path
from typing import Tuple, Dict, Any, List
import joblib
import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow.keras.callbacks import EarlyStopping

from ml.config import (
    SYMBOLS,
    SEQUENCE_LENGTH,
    TRAIN_SPLIT,
    VAL_SPLIT,
    TEST_SPLIT,
    FEATURE_COLS,
    TARGET_COL,
    DATA_PERIOD,
    SAVED_MODELS_DIR
)
from ml.models import build_lstm_model, build_gru_model, build_cnn_model

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def fetch_historical_data(symbol: str, period: str = DATA_PERIOD) -> pd.DataFrame:
    """Fetch OHLCV data from Yahoo Finance."""
    logger.info(f"Downloading historical data for {symbol} (period={period})...")
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period)
    if df.empty or len(df) < (SEQUENCE_LENGTH + 50):
        raise ValueError(f"Insufficient data retrieved for {symbol}. Rows: {len(df)}")
    df = df[FEATURE_COLS].dropna()
    logger.info(f"Retrieved {len(df)} trading days for {symbol}.")
    return df

def prepare_dataset(df: pd.DataFrame, window_size: int = SEQUENCE_LENGTH) -> Tuple[
    np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, MinMaxScaler, MinMaxScaler, List[str]
]:
    """
    Strict chronological split: 70% train / 15% val / 15% test.
    Zero shuffling to prevent data leakage. Fit scalers on train ONLY.
    """
    total_len = len(df)
    train_end = int(total_len * TRAIN_SPLIT)
    val_end = int(total_len * (TRAIN_SPLIT + VAL_SPLIT))

    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end:val_end]
    test_df = df.iloc[val_end:]

    logger.info(f"Dataset split sizes — Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")

    # Fit scalers ONLY on training split
    feature_scaler = MinMaxScaler(feature_range=(0, 1))
    target_scaler = MinMaxScaler(feature_range=(0, 1))

    feature_scaler.fit(train_df[FEATURE_COLS].values)
    target_scaler.fit(train_df[[TARGET_COL]].values)

    # Scale the entire sequence
    scaled_data = feature_scaler.transform(df[FEATURE_COLS].values)
    scaled_close = target_scaler.transform(df[[TARGET_COL]].values)

    # Window creation
    X, y = [], []
    for i in range(window_size, len(scaled_data)):
        X.append(scaled_data[i - window_size:i])
        y.append(scaled_close[i, 0])

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)

    train_idx = max(0, train_end - window_size)
    val_idx = max(train_idx, val_end - window_size)

    X_train, y_train = X[:train_idx], y[:train_idx]
    X_val, y_val = X[train_idx:val_idx], y[train_idx:val_idx]
    X_test, y_test = X[val_idx:], y[val_idx:]

    date_strings = [d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10] for d in df.index]
    test_dates = date_strings[val_end:]

    return X_train, y_train, X_val, y_val, X_test, y_test, feature_scaler, target_scaler, test_dates

def train_and_save_all(symbol: str, output_base_dir: Path = SAVED_MODELS_DIR, epochs: int = 35, batch_size: int = 32) -> Dict[str, Any]:
    """Train LSTM, GRU, and 1D CNN models for a given stock symbol and save weights."""
    symbol_dir = output_base_dir / symbol
    symbol_dir.mkdir(parents=True, exist_ok=True)

    df = fetch_historical_data(symbol, period=DATA_PERIOD)
    X_train, y_train, X_val, y_val, X_test, y_test, feat_scaler, tgt_scaler, test_dates = prepare_dataset(df)

    # Save scalers together
    scalers_path = symbol_dir / "scaler.joblib"
    joblib.dump({
        "feature_scaler": feat_scaler,
        "target_scaler": tgt_scaler,
        "feature_cols": FEATURE_COLS,
        "window_size": SEQUENCE_LENGTH
    }, scalers_path)
    logger.info(f"Saved scalers to {scalers_path}")

    # Build the 3 architectures with identical input shapes and EarlyStopping
    models_to_train = {
        "lstm": build_lstm_model(input_shape=(SEQUENCE_LENGTH, len(FEATURE_COLS))),
        "gru": build_gru_model(input_shape=(SEQUENCE_LENGTH, len(FEATURE_COLS))),
        "cnn": build_cnn_model(input_shape=(SEQUENCE_LENGTH, len(FEATURE_COLS))),
    }

    training_metadata = {}

    for name, model in models_to_train.items():
        logger.info(f"=== Training {name.upper()} model for {symbol} ===")
        early_stopping = EarlyStopping(
            monitor="val_loss",
            patience=8,
            restore_best_weights=True,
            verbose=0
        )

        start_time = time.time()
        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stopping],
            verbose=1
        )
        duration = round(time.time() - start_time, 2)
        
        # Save model in native .keras format
        model_path = symbol_dir / f"{name}.keras"
        model.save(str(model_path))
        
        # Also save cnn1d.keras alias if model is cnn
        if name == "cnn":
            cnn1d_path = symbol_dir / "cnn1d.keras"
            model.save(str(cnn1d_path))

        logger.info(f"Saved {name.upper()} to {model_path} (Training time: {duration}s, Epochs: {len(history.history['loss'])})")

        training_metadata[name] = {
            "training_time_seconds": duration,
            "final_train_loss": float(history.history["loss"][-1]),
            "final_val_loss": float(history.history["val_loss"][-1]),
            "epochs_run": len(history.history["loss"])
        }

    # Save training info
    info_path = symbol_dir / "training_info.json"
    with open(info_path, "w") as f:
        json.dump(training_metadata, f, indent=2)

    return {
        "symbol": symbol,
        "training_metadata": training_metadata,
        "test_data": (X_test, y_test, tgt_scaler, test_dates)
    }

if __name__ == "__main__":
    print(f"\n=======================================================")
    print(f"  Starting Offline Pipeline for SYMBOLS: {SYMBOLS}")
    print(f"=======================================================")
    for sym in SYMBOLS:
        print(f"\n>>> Training models for {sym}...")
        train_and_save_all(sym, SAVED_MODELS_DIR)
