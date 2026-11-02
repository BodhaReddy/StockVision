from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class StockSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str = "NSE"
    sector: Optional[str] = None

class StockHistoricalPoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    ma20: Optional[float] = None
    ma50: Optional[float] = None

class StockSummary(BaseModel):
    symbol: str
    name: str
    current_price: float
    change: float
    percent_change: float
    open: float
    high: float
    low: float
    previous_close: float
    volume: int
    pe_ratio: Optional[float] = None
    market_cap: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    currency: str = "INR"

class StockHistoryResponse(BaseModel):
    symbol: str
    period: str
    summary: StockSummary
    data: List[StockHistoricalPoint]

class TrendAnalysisResponse(BaseModel):
    symbol: str
    current_price: float
    trend: Literal["Bullish", "Bearish", "Sideways"]
    signal_strength: str
    ma20: Optional[float]
    ma50: Optional[float]
    rsi_14: Optional[float]
    macd: Optional[float]
    macd_signal: Optional[float]
    macd_histogram: Optional[float]
    annualized_volatility: Optional[float]
    momentum_10d_pct: Optional[float]
    reasoning: List[str]
    plain_english_explanation: Optional[str] = None

class VolatilityPoint(BaseModel):
    date: str
    close: float
    daily_return_pct: Optional[float] = None
    rolling_volatility_30d: Optional[float] = None

class VolatilityPeakPeriod(BaseModel):
    date: str
    volatility_pct: float
    close_price: float
    daily_return_pct: Optional[float] = None
    description: str

class StockVolatilityResponse(BaseModel):
    symbol: str
    company_name: str
    current_price: float
    current_volatility: float
    average_volatility: float
    max_volatility: float
    min_volatility: float
    risk_level: Literal["Low", "Moderate", "Elevated", "High"]
    highest_volatility_periods: List[VolatilityPeakPeriod]
    time_series: List[VolatilityPoint]
    summary: str

class WatchlistVolatilityItem(BaseModel):
    symbol: str
    name: Optional[str] = None
    current_price: float
    current_volatility: float
    average_volatility: float
    max_volatility: float
    risk_level: str
    daily_change_pct: float

class WatchlistVolatilityComparisonResponse(BaseModel):
    stocks: List[WatchlistVolatilityItem]
    most_volatile: Optional[str] = None
    least_volatile: Optional[str] = None
    average_market_volatility: float
    summary: str

class PredictRequest(BaseModel):
    symbol: str = Field(..., examples=["RELIANCE.NS"])
    model: Literal["lstm", "gru", "cnn", "cnn1d", "LSTM", "GRU", "CNN", "CNN1D"] = Field("lstm", examples=["lstm"])
    horizon: int = Field(5, ge=1, le=30, examples=[5])

class ForecastPoint(BaseModel):
    step: int
    date: str
    predicted_close: float
    lower_bound: float
    upper_bound: float

class FeatureImportance(BaseModel):
    feature: str
    importance_pct: float
    description: str

class PredictionExplanation(BaseModel):
    recent_trend_summary: str
    moving_averages_context: str
    volume_change_context: str
    influential_factors: List[str]
    feature_importance: List[FeatureImportance]
    label: str = "Influential input features, not causes of price movement"
    disclaimer: str = "Statistical sensitivity across 60-day input sequences does not imply market causation."

class PredictResponse(BaseModel):
    symbol: str
    model: str
    horizon: int
    latest_close: float
    predicted_close: float
    expected_change: float
    expected_change_pct: float
    direction: Literal["UP", "DOWN", "FLAT"]
    forecast: List[ForecastPoint]
    historical_context: List[StockHistoricalPoint]
    explanation: Optional[PredictionExplanation] = None
    disclaimer: str = "Experimental forecasts for educational use, not investment advice."

class ModelMetrics(BaseModel):
    mae: float
    rmse: float
    mape: float
    directional_accuracy: float
    training_time_seconds: Optional[float] = None

class TestChartPoint(BaseModel):
    date: str
    actual: float
    naive: Optional[float] = None
    lstm: Optional[float] = None
    gru: Optional[float] = None
    cnn: Optional[float] = None

class ModelComparisonResponse(BaseModel):
    symbol: str
    metrics: Dict[str, ModelMetrics]
    best_models: Dict[str, str]
    test_chart_data: Optional[List[Dict[str, Any]]] = None
    disclaimer: str = "Experimental forecasts for educational use, not investment advice."

# --- Phase 4 Schemas ---

class WatchlistAddRequest(BaseModel):
    symbol: str = Field(..., examples=["RELIANCE.NS"])

class WatchlistItem(BaseModel):
    id: str
    symbol: str
    name: str
    current_price: float
    change: float
    percent_change: float
    created_at: str

class PredictionHistoryItem(BaseModel):
    id: str
    user_id: str
    symbol: str
    model: str
    horizon: int
    latest_price: float
    predicted_prices: List[Dict[str, Any]]
    final_predicted_price: float
    expected_change: float
    expected_change_pct: float
    direction: str
    created_at: str

class UserProfileResponse(BaseModel):
    id: str
    email: str
    is_admin: bool = False
    saved_stocks_count: int
    predictions_count: int
    created_at: Optional[str] = None

# --- Phase 5b: Admin Dashboard Schemas ---

class TrainedModelInfo(BaseModel):
    symbol: str
    models: List[str]
    last_trained_date: str
    epochs_run: Optional[int] = None
    training_time_seconds: Optional[float] = None
    size_kb: float
    status: str = "Active"

class AdminDashboardStats(BaseModel):
    total_users: int
    total_predictions: int
    predictions_by_model: Dict[str, int]
    most_predicted_stocks: List[Dict[str, Any]]
    trained_models: List[TrainedModelInfo]
    system_status: Dict[str, Any]
