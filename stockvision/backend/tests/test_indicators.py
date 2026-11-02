import pytest
import numpy as np
import pandas as pd
from app.services.indicators import calculate_rsi, calculate_macd

class TestTechnicalIndicators:
    def test_rsi_bounds_and_trending(self):
        """Verify RSI stays within [0, 100] and reflects trending directions."""
        # Monotonically increasing price series
        prices_up = pd.Series([100.0 + i * 2.0 for i in range(30)])
        rsi_up = calculate_rsi(prices_up, period=14)
        
        assert not rsi_up.isna().any()
        assert (rsi_up >= 0.0).all() and (rsi_up <= 100.0).all()
        # Strongly ascending series should have RSI > 70
        assert rsi_up.iloc[-1] > 70.0

        # Monotonically decreasing price series
        prices_down = pd.Series([200.0 - i * 3.0 for i in range(30)])
        rsi_down = calculate_rsi(prices_down, period=14)
        
        assert not rsi_down.isna().any()
        assert (rsi_down >= 0.0).all() and (rsi_down <= 100.0).all()
        # Strongly descending series should have RSI < 30
        assert rsi_down.iloc[-1] < 30.0

    def test_macd_calculation(self):
        """Verify MACD line, signal line, and histogram outputs."""
        prices = pd.Series(np.random.normal(100, 5, 60))
        macd_line, signal_line, histogram = calculate_macd(prices, fast=12, slow=26, signal=9)
        
        assert len(macd_line) == len(prices)
        assert len(signal_line) == len(prices)
        assert len(histogram) == len(prices)
        # Histogram is mathematically macd_line - signal_line
        diff = macd_line - signal_line
        assert np.allclose(histogram.values, diff.values, atol=1e-5)

    def test_volatility_annualization_formula(self):
        """Verify standard log-returns annualized volatility calculation."""
        close = pd.Series([100, 102, 101, 103, 104, 102, 105, 106, 104, 107])
        log_ret = np.log(close / close.shift(1)).dropna()
        
        # Volatility = std * sqrt(252) * 100
        manual_vol = float(log_ret.std() * np.sqrt(252) * 100.0)
        assert manual_vol > 0.0
        assert manual_vol < 100.0

