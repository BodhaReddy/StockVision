import os
# Suppress noisy TF logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from ml.config import SEQUENCE_LENGTH, FEATURE_COLS

DEFAULT_INPUT_SHAPE = (SEQUENCE_LENGTH, len(FEATURE_COLS))

def build_lstm_model(input_shape=DEFAULT_INPUT_SHAPE) -> keras.Model:
    """Stacked LSTM architecture for multi-feature sequence-to-one forecasting (kept unchanged)."""
    model = keras.Sequential([
        layers.Input(shape=input_shape),
        layers.LSTM(64, return_sequences=True),
        layers.Dropout(0.2),
        layers.LSTM(32, return_sequences=False),
        layers.Dropout(0.2),
        layers.Dense(16, activation="relu"),
        layers.Dense(1)
    ], name="LSTM_Forecaster")
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="mse",
        metrics=["mae"]
    )
    return model

def build_gru_model(input_shape=DEFAULT_INPUT_SHAPE) -> keras.Model:
    """Gated Recurrent Unit (GRU) architecture with fair comparable capacity."""
    model = keras.Sequential([
        layers.Input(shape=input_shape),
        layers.GRU(64, return_sequences=True),
        layers.Dropout(0.2),
        layers.GRU(32, return_sequences=False),
        layers.Dropout(0.2),
        layers.Dense(16, activation="relu"),
        layers.Dense(1)
    ], name="GRU_Forecaster")
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="mse",
        metrics=["mae"]
    )
    return model

def build_cnn_model(input_shape=DEFAULT_INPUT_SHAPE) -> keras.Model:
    """1D Temporal Convolutional Neural Network (CNN) for feature pattern extraction."""
    model = keras.Sequential([
        layers.Input(shape=input_shape),
        layers.Conv1D(filters=64, kernel_size=3, activation="relu", padding="same"),
        layers.MaxPooling1D(pool_size=2),
        layers.Conv1D(filters=32, kernel_size=3, activation="relu", padding="same"),
        layers.MaxPooling1D(pool_size=2),
        layers.Flatten(),
        layers.Dense(32, activation="relu"),
        layers.Dropout(0.2),
        layers.Dense(1)
    ], name="CNN1D_Forecaster")
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="mse",
        metrics=["mae"]
    )
    return model

# Alias for backward compatibility
build_cnn1d_model = build_cnn_model

def get_model_builder(model_type: str):
    m = model_type.lower().strip()
    if m in ("lstm",):
        return build_lstm_model
    elif m in ("gru",):
        return build_gru_model
    elif m in ("cnn", "cnn1d", "1d_cnn", "1d cnn"):
        return build_cnn_model
    else:
        raise ValueError(f"Unknown model type '{model_type}'. Choose from 'lstm', 'gru', 'cnn'.")
