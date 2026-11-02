import pytest
import numpy as np
import pandas as pd
from ml.train import prepare_dataset
from ml.config import SEQUENCE_LENGTH, TRAIN_SPLIT, VAL_SPLIT, TEST_SPLIT, FEATURE_COLS, TARGET_COL

def create_synthetic_ohlcv(num_days: int = 400) -> pd.DataFrame:
    """Generate reproducible synthetic stock data for testing."""
    np.random.seed(42)
    dates = pd.date_range(start="2024-01-01", periods=num_days, freq="B")
    
    # Random walk for close prices
    returns = np.random.normal(0.0005, 0.015, num_days)
    close_prices = 1000.0 * np.exp(np.cumsum(returns))
    
    open_prices = close_prices * (1 + np.random.normal(0, 0.005, num_days))
    high_prices = np.maximum(open_prices, close_prices) * (1 + np.random.uniform(0.001, 0.015, num_days))
    low_prices = np.minimum(open_prices, close_prices) * (1 - np.random.uniform(0.001, 0.015, num_days))
    volumes = np.random.randint(100_000, 5_000_000, num_days)
    
    df = pd.DataFrame({
        "Open": open_prices,
        "High": high_prices,
        "Low": low_prices,
        "Close": close_prices,
        "Volume": volumes,
    }, index=dates)
    
    return df

class TestPreprocessing:
    def test_chronological_split_ratios(self):
        """Verify 70% train / 15% val / 15% test chronological partitioning."""
        num_days = 400
        df = create_synthetic_ohlcv(num_days)
        window = 30
        
        X_train, y_train, X_val, y_val, X_test, y_test, _, _, test_dates = prepare_dataset(df, window_size=window)
        
        total_samples = len(X_train) + len(X_val) + len(X_test)
        assert total_samples == (num_days - window), "Total sequence count must equal total days minus window size"
        
        # Verify chronological split boundaries
        train_end = int(num_days * TRAIN_SPLIT)
        val_end = int(num_days * (TRAIN_SPLIT + VAL_SPLIT))
        expected_train_count = train_end - window
        expected_val_count = val_end - train_end
        
        assert len(X_train) == expected_train_count
        assert len(X_val) == expected_val_count
        assert len(X_test) == (num_days - val_end)
        assert len(test_dates) == (num_days - val_end)

    def test_no_data_leakage_in_scalers(self):
        """
        Verify that MinMaxScaler is fit strictly on the training split,
        ensuring zero future test data leaks into feature scaling.
        """
        num_days = 300
        df = create_synthetic_ohlcv(num_days)
        train_end = int(num_days * TRAIN_SPLIT)
        train_df = df.iloc[:train_end]
        test_df = df.iloc[train_end:]
        
        X_train, y_train, X_val, y_val, X_test, y_test, feat_scaler, tgt_scaler, _ = prepare_dataset(df, window_size=20)
        
        # The fitted data_min_ and data_max_ on target_scaler must exactly match the train_df Close min and max
        assert np.isclose(tgt_scaler.data_min_[0], train_df[TARGET_COL].min(), rtol=1e-5)
        assert np.isclose(tgt_scaler.data_max_[0], train_df[TARGET_COL].max(), rtol=1e-5)
        
        # Verify feature_scaler min/max matches train_df columns
        for idx, col in enumerate(FEATURE_COLS):
            assert np.isclose(feat_scaler.data_min_[idx], train_df[col].min(), rtol=1e-5)
            assert np.isclose(feat_scaler.data_max_[idx], train_df[col].max(), rtol=1e-5)

    def test_sequence_window_shapes(self):
        """Verify 3D tensor shapes: (samples, window_size, features)."""
        df = create_synthetic_ohlcv(200)
        window = 45
        
        X_train, y_train, X_val, y_val, X_test, y_test, _, _, _ = prepare_dataset(df, window_size=window)
        
        assert X_train.ndim == 3
        assert X_train.shape[1] == window
        assert X_train.shape[2] == len(FEATURE_COLS)
        assert y_train.ndim == 1
        assert len(X_train) == len(y_train)

    def test_scaled_values_range(self):
        """Verify that training target and features are normalized in [0, 1]."""
        df = create_synthetic_ohlcv(200)
        X_train, y_train, _, _, _, _, _, _, _ = prepare_dataset(df, window_size=20)
        
        assert np.all(X_train >= 0.0) and np.all(X_train <= 1.0)
        assert np.all(y_train >= 0.0) and np.all(y_train <= 1.0)

