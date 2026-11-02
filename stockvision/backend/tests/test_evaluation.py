import pytest
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error
from ml.evaluate import compute_mape, compute_directional_accuracy

class TestEvaluationMetrics:
    def test_compute_mape_exact(self):
        """Verify MAPE computation on known actual and predicted arrays."""
        actual = np.array([100.0, 200.0, 300.0])
        predicted = np.array([110.0, 190.0, 315.0])
        # |100-110|/100 = 10%
        # |200-190|/200 = 5%
        # |300-315|/300 = 5%
        # Mean = 20 / 3 = 6.6666...%
        mape = compute_mape(actual, predicted)
        assert np.isclose(mape, 20.0 / 3.0, atol=1e-4)

    def test_compute_mape_zero_handling(self):
        """Verify that division by zero is safely masked out."""
        actual = np.array([0.0, 100.0, 200.0])
        predicted = np.array([10.0, 110.0, 220.0])
        # Only [100, 200] should be evaluated: (10% + 10%) / 2 = 10.0%
        mape = compute_mape(actual, predicted)
        assert np.isclose(mape, 10.0, atol=1e-4)

    def test_compute_directional_accuracy_perfect_match(self):
        """Verify 100% directional accuracy when sign of changes matches perfectly."""
        prev = np.array([100.0, 105.0, 102.0, 110.0])
        actual = np.array([105.0, 102.0, 108.0, 112.0])    # [+5, -3, +6, +2]
        predicted = np.array([102.0, 100.0, 115.0, 111.0]) # [+2, -5, +13, +1]
        
        acc = compute_directional_accuracy(actual, predicted, prev)
        assert acc == 100.0

    def test_compute_directional_accuracy_zero_match(self):
        """Verify 0% directional accuracy when predicted directions are all opposite."""
        prev = np.array([100.0, 105.0, 102.0])
        actual = np.array([105.0, 100.0, 110.0])    # [+5, -5, +8]
        predicted = np.array([95.0, 110.0, 99.0])   # [-5, +5, -3]
        
        acc = compute_directional_accuracy(actual, predicted, prev)
        assert acc == 0.0

    def test_compute_directional_accuracy_fifty_percent(self):
        """Verify 50% directional accuracy on 2 matches and 2 mismatches."""
        prev = np.array([100.0, 100.0, 100.0, 100.0])
        actual = np.array([105.0, 105.0, 95.0, 95.0])    # [+, +, -, -]
        predicted = np.array([102.0, 98.0, 92.0, 102.0]) # [+, -, -, +] -> 2 match, 2 fail
        
        acc = compute_directional_accuracy(actual, predicted, prev)
        assert acc == 50.0

    def test_naive_baseline_metric_behavior(self):
        """
        Verify that naive baseline ('tomorrow close = today close')
        evaluates correctly on one-step predictions.
        """
        actual_test = np.array([102.0, 105.0, 103.0, 107.0])
        prev_actual = np.array([100.0, 102.0, 105.0, 103.0])
        
        # Naive prediction: pred[i] = prev_actual[i]
        naive_pred = prev_actual
        
        mae = mean_absolute_error(actual_test, naive_pred)
        rmse = np.sqrt(mean_squared_error(actual_test, naive_pred))
        
        # deltas: |102-100|=2, |105-102|=3, |103-105|=2, |107-103|=4 -> MAE = (2+3+2+4)/4 = 2.75
        assert np.isclose(mae, 2.75)
        # squares: 4 + 9 + 4 + 16 = 33 -> MSE = 33/4 = 8.25 -> RMSE = sqrt(8.25) ~ 2.87228
        assert np.isclose(rmse, np.sqrt(8.25))

