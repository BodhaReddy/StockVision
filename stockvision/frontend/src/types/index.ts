export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
}

export interface StockHistoricalPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20?: number | null;
  ma50?: number | null;
}

export interface StockSummary {
  symbol: string;
  name: string;
  current_price: number;
  change: number;
  percent_change: number;
  open: number;
  high: number;
  low: number;
  previous_close: number;
  volume: number;
  pe_ratio?: number | null;
  market_cap?: number | null;
  fifty_two_week_high?: number | null;
  fifty_two_week_low?: number | null;
  currency: string;
}

export interface StockHistoryResponse {
  symbol: string;
  period: string;
  summary: StockSummary;
  data: StockHistoricalPoint[];
}

export interface TrendAnalysisResponse {
  symbol: string;
  current_price: number;
  trend: 'Bullish' | 'Bearish' | 'Sideways';
  signal_strength: string;
  ma20?: number | null;
  ma50?: number | null;
  rsi_14?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  macd_histogram?: number | null;
  annualized_volatility?: number | null;
  momentum_10d_pct?: number | null;
  reasoning: string[];
  plain_english_explanation?: string;
}

export interface VolatilityPoint {
  date: string;
  close: number;
  daily_return_pct?: number | null;
  rolling_volatility_30d?: number | null;
}

export interface VolatilityPeakPeriod {
  date: string;
  volatility_pct: number;
  close_price: number;
  daily_return_pct?: number | null;
  description: string;
}

export interface StockVolatilityResponse {
  symbol: string;
  company_name: string;
  current_price: number;
  current_volatility: number;
  average_volatility: number;
  max_volatility: number;
  min_volatility: number;
  risk_level: 'Low' | 'Moderate' | 'Elevated' | 'High';
  highest_volatility_periods: VolatilityPeakPeriod[];
  time_series: VolatilityPoint[];
  summary: string;
}

export interface WatchlistVolatilityItem {
  symbol: string;
  name?: string | null;
  current_price: number;
  current_volatility: number;
  average_volatility: number;
  max_volatility: number;
  risk_level: string;
  daily_change_pct: number;
}

export interface WatchlistVolatilityComparisonResponse {
  stocks: WatchlistVolatilityItem[];
  most_volatile?: string | null;
  least_volatile?: string | null;
  average_market_volatility: number;
  summary: string;
}

export interface ForecastPoint {
  step: number;
  date: string;
  predicted_close: number;
  lower_bound: number;
  upper_bound: number;
}

export interface PredictRequest {
  symbol: string;
  model: 'lstm' | 'gru' | 'cnn';
  horizon: number;
}

export interface FeatureImportance {
  feature: string;
  importance_pct: number;
  description: string;
}

export interface PredictionExplanation {
  recent_trend_summary: string;
  moving_averages_context: string;
  volume_change_context: string;
  influential_factors: string[];
  feature_importance: FeatureImportance[];
  label: string;
  disclaimer: string;
}

export interface PredictResponse {
  symbol: string;
  model: string;
  horizon: number;
  latest_close: number;
  predicted_close: number;
  expected_change: number;
  expected_change_pct: number;
  direction: 'UP' | 'DOWN' | 'FLAT';
  forecast: ForecastPoint[];
  historical_context: StockHistoricalPoint[];
  explanation?: PredictionExplanation | null;
  disclaimer: string;
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  mape: number;
  directional_accuracy: number;
  training_time_seconds?: number;
}

export interface TestChartPoint {
  date: string;
  actual: number;
  naive?: number;
  lstm?: number;
  gru?: number;
  cnn?: number;
}

export interface ModelComparisonResponse {
  symbol: string;
  metrics: {
    lstm?: ModelMetrics;
    gru?: ModelMetrics;
    cnn?: ModelMetrics;
    cnn1d?: ModelMetrics;
    naive_baseline?: ModelMetrics;
    [key: string]: ModelMetrics | undefined;
  };
  best_models: {
    mae: string;
    rmse: string;
    mape: string;
    directional_accuracy: string;
  };
  test_chart_data?: TestChartPoint[];
  disclaimer: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  change: number;
  percent_change: number;
  created_at: string;
}

export interface PredictionHistoryItem {
  id: string;
  user_id: string;
  symbol: string;
  model: string;
  horizon: number;
  latest_price: number;
  predicted_prices: ForecastPoint[] | any[];
  final_predicted_price: number;
  expected_change: number;
  expected_change_pct: number;
  direction: 'UP' | 'DOWN' | 'FLAT' | string;
  created_at: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  is_admin?: boolean;
  saved_stocks_count: number;
  predictions_count: number;
  created_at?: string;
}

export interface TrainedModelInfo {
  symbol: string;
  models: string[];
  last_trained_date: string;
  epochs_run?: number | null;
  training_time_seconds?: number | null;
  size_kb: number;
  status: string;
}

export interface AdminDashboardStats {
  total_users: number;
  total_predictions: number;
  predictions_by_model: Record<string, number>;
  most_predicted_stocks: Array<{ symbol: string; count: number }>;
  trained_models: TrainedModelInfo[];
  system_status: Record<string, any>;
}
