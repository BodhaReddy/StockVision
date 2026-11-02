"""Configuration for StockVision ML Pipeline."""
from pathlib import Path

# Supported core NSE symbols for pre-training and evaluation (28 Major Blue-Chip Equities)
SYMBOLS = [
    "RELIANCE.NS",
    "TCS.NS",
    "HDFCBANK.NS",
    "ICICIBANK.NS",
    "INFY.NS",
    "BHARTIARTL.NS",
    "SBIN.NS",
    "ITC.NS",
    "HINDUNILVR.NS",
    "LT.NS",
    "BAJFINANCE.NS",
    "KOTAKBANK.NS",
    "AXISBANK.NS",
    "MARUTI.NS",
    "SUNPHARMA.NS",
    "TITAN.NS",
    "ASIANPAINT.NS",
    "NTPC.NS",
    "POWERGRID.NS",
    "ONGC.NS",
    "TATASTEEL.NS",
    "M&M.NS",
    "ADANIENT.NS",
    "WIPRO.NS",
    "COALINDIA.NS",
    "HCLTECH.NS",
    "BAJAJ-AUTO.NS",
    "ULTRACEMCO.NS",
]

# Temporal window sequence length (trading days)
SEQUENCE_LENGTH = 60

# Chronological split ratios (no shuffling to prevent data leakage)
TRAIN_SPLIT = 0.70
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15

# Feature columns
FEATURE_COLS = ["Open", "High", "Low", "Close", "Volume"]
TARGET_COL = "Close"

# Historical fetch period
DATA_PERIOD = "3y"

# Base directory for saved models
BASE_DIR = Path(__file__).resolve().parent
SAVED_MODELS_DIR = BASE_DIR / "saved_models"

