import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from cachetools import TTLCache
from app.services.yfinance_service import get_raw_history_df, get_stock_summary
from app.schemas import (
    TrendAnalysisResponse,
    StockVolatilityResponse,
    VolatilityPoint,
    VolatilityPeakPeriod,
    WatchlistVolatilityItem,
    WatchlistVolatilityComparisonResponse,
)

# Volatility cache (5 minute TTL)
volatility_cache = TTLCache(maxsize=100, ttl=300)

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = (delta.where(delta > 0, 0.0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0.0)).rolling(window=period).mean()

    # Standard Wilder RSI: RS = Average Gain / Average Loss
    rs = gain / loss.replace(0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))

    # Pure trend edge cases
    # If zero losses and positive gains -> 100% RSI
    rsi = rsi.where(~((loss == 0) & (gain > 0)), 100.0)
    # If zero gains and positive losses -> 0% RSI
    rsi = rsi.where(~((gain == 0) & (loss > 0)), 0.0)

    return rsi.fillna(50.0)

def calculate_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    exp1 = series.ewm(span=fast, adjust=False).mean()
    exp2 = series.ewm(span=slow, adjust=False).mean()
    macd_line = exp1 - exp2
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

def analyze_trend(symbol: str) -> TrendAnalysisResponse:
    """Analyze technical trend and volatility for a stock symbol."""
    df = get_raw_history_df(symbol, period="1y")
    if len(df) < 50:
        raise ValueError("Insufficient data points for technical analysis")

    close = df["Close"]
    
    # 1. Moving Averages
    ma20 = close.rolling(20).mean().iloc[-1]
    ma50 = close.rolling(50).mean().iloc[-1]
    current_price = close.iloc[-1]
    
    # 2. RSI
    rsi_series = calculate_rsi(close, 14)
    rsi = float(rsi_series.iloc[-1])
    
    # 3. MACD
    macd, signal, hist = calculate_macd(close)
    curr_macd = float(macd.iloc[-1])
    curr_signal = float(signal.iloc[-1])
    curr_hist = float(hist.iloc[-1])
    
    # 4. Volatility (Annualized log returns std * sqrt(252))
    log_returns = np.log(close / close.shift(1)).dropna()
    volatility = float(log_returns.std() * np.sqrt(252) * 100.0)
    
    # 5. Momentum (10-day % change)
    mom_10d = float(((current_price - close.iloc[-11]) / close.iloc[-11]) * 100.0) if len(close) > 11 else 0.0

    # Trend logic
    reasoning: List[str] = []
    bullish_votes = 0
    bearish_votes = 0
    
    # Moving average check
    if current_price > ma20 > ma50:
        bullish_votes += 2
        reasoning.append(f"Price (₹{current_price:.2f}) is trading comfortably above both 20-day (₹{ma20:.2f}) and 50-day (₹{ma50:.2f}) SMA.")
    elif current_price < ma20 < ma50:
        bearish_votes += 2
        reasoning.append(f"Price (₹{current_price:.2f}) is below both 20-day (₹{ma20:.2f}) and 50-day (₹{ma50:.2f}) SMA indicating downward pressure.")
    else:
        reasoning.append(f"Moving averages are intermixed (Price ₹{current_price:.2f}, MA20 ₹{ma20:.2f}, MA50 ₹{ma50:.2f}), signaling consolidation.")

    # MACD check
    if curr_macd > curr_signal:
        bullish_votes += 1
        reasoning.append(f"MACD line ({curr_macd:.2f}) is above the signal line ({curr_signal:.2f}), confirming positive short-term momentum.")
    else:
        bearish_votes += 1
        reasoning.append(f"MACD line ({curr_macd:.2f}) is below signal line ({curr_signal:.2f}), hinting at potential bearish divergence.")

    # RSI check
    if rsi > 70:
        reasoning.append(f"RSI is at {rsi:.1f}, indicating an overbought condition where buyers should exercise caution.")
    elif rsi < 30:
        reasoning.append(f"RSI is at {rsi:.1f}, reflecting an oversold condition that could precede a technical bounce.")
    elif rsi > 55:
        bullish_votes += 1
        reasoning.append(f"RSI is healthy at {rsi:.1f}, showing positive bullish momentum without being overextended.")
    elif rsi < 45:
        bearish_votes += 1
        reasoning.append(f"RSI is subdued at {rsi:.1f}, indicating weakness in buying demand.")
    else:
        reasoning.append(f"RSI is neutral at {rsi:.1f}.")

    # Volatility remark
    reasoning.append(f"Annualized volatility stands at {volatility:.2f}%, with 10-day price momentum of {mom_10d:+.2f}%.")

    # Final verdict
    if bullish_votes >= 3 and bullish_votes > bearish_votes:
        trend = "Bullish"
        strength = "Strong Buy Bias" if bullish_votes >= 4 else "Moderate Bullish"
    elif bearish_votes >= 3 and bearish_votes > bullish_votes:
        trend = "Bearish"
        strength = "Strong Sell Bias" if bearish_votes >= 4 else "Moderate Bearish"
    else:
        trend = "Sideways"
        strength = "Neutral / Consolidation"

    # Generate concise plain-English explanation
    if trend == "Bullish":
        plain_english = (
            f"{symbol} is currently classified as Bullish. The stock trades at ₹{current_price:,.2f}, "
            f"holding above both its 20-day (₹{ma20:,.2f}) and 50-day (₹{ma50:,.2f}) moving averages. "
            f"RSI(14) at {rsi:.1f} signals constructive buying appetite, while 10-day price momentum is positive ({mom_10d:+.2f}%)."
        )
    elif trend == "Bearish":
        plain_english = (
            f"{symbol} is currently classified as Bearish. The price has dropped to ₹{current_price:,.2f}, "
            f"slipping below both its 20-day (₹{ma20:,.2f}) and 50-day (₹{ma50:,.2f}) moving averages. "
            f"Subdued RSI(14) of {rsi:.1f} and negative momentum ({mom_10d:+.2f}%) suggest continued downward pressure."
        )
    else:
        plain_english = (
            f"{symbol} is currently classified as Sideways. Trading at ₹{current_price:,.2f} between key moving averages "
            f"(20-day ₹{ma20:,.2f} vs 50-day ₹{ma50:,.2f}), the stock displays neutral RSI(14) at {rsi:.1f} and flat "
            f"short-term momentum ({mom_10d:+.2f}%), indicating range-bound consolidation."
        )

    return TrendAnalysisResponse(
        symbol=symbol,
        current_price=round(float(current_price), 2),
        trend=trend,
        signal_strength=strength,
        ma20=round(float(ma20), 2),
        ma50=round(float(ma50), 2),
        rsi_14=round(rsi, 2),
        macd=round(curr_macd, 2),
        macd_signal=round(curr_signal, 2),
        macd_histogram=round(curr_hist, 2),
        annualized_volatility=round(volatility, 2),
        momentum_10d_pct=round(mom_10d, 2),
        reasoning=reasoning,
        plain_english_explanation=plain_english
    )


def calculate_volatility_analysis(symbol: str, period: str = "1y") -> StockVolatilityResponse:
    """
    Computes daily returns, rolling 30-day annualized volatility, and detects
    highest-volatility periods for a given stock symbol.
    """
    cache_key = f"vol_{symbol}_{period}"
    if cache_key in volatility_cache:
        return volatility_cache[cache_key]

    df = get_raw_history_df(symbol, period=period)
    if len(df) < 35:
        raise ValueError(f"Insufficient historical data ({len(df)} days) to compute 30-day volatility for {symbol}.")

    close = df["Close"]
    daily_returns_pct = close.pct_change() * 100.0
    log_returns = np.log(close / close.shift(1))
    
    # Rolling 30-day annualized volatility: std * sqrt(252) * 100
    rolling_vol_30d = log_returns.rolling(window=30, min_periods=10).std() * np.sqrt(252) * 100.0

    valid_vol = rolling_vol_30d.dropna()
    if valid_vol.empty:
        raise ValueError("Could not calculate rolling volatility.")

    current_vol = float(valid_vol.iloc[-1])
    avg_vol = float(valid_vol.mean())
    max_vol = float(valid_vol.max())
    min_vol = float(valid_vol.min())
    latest_close = float(close.iloc[-1])

    # Categorize Risk
    if current_vol < 18.0:
        risk_level = "Low"
    elif current_vol < 30.0:
        risk_level = "Moderate"
    elif current_vol < 42.0:
        risk_level = "Elevated"
    else:
        risk_level = "High"

    # Identify top 5 highest-volatility periods separated by at least 10 trading days
    sorted_indices = valid_vol.sort_values(ascending=False).index
    peak_periods: List[VolatilityPeakPeriod] = []
    selected_dates = []

    for dt in sorted_indices:
        if all(abs((dt - s_dt).days) >= 10 for s_dt in selected_dates):
            selected_dates.append(dt)
            date_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10]
            v_val = float(valid_vol[dt])
            c_val = float(close[dt])
            r_val = float(daily_returns_pct[dt]) if pd.notna(daily_returns_pct[dt]) else 0.0

            if r_val < -2.0:
                event_desc = f"Heavy selling pressure with a {r_val:.2f}% drop as annualized volatility surged to {v_val:.1f}%."
            elif r_val > 2.0:
                event_desc = f"Aggressive buying rally with a {r_val:+.2f}% jump pushing 30-day volatility to {v_val:.1f}%."
            else:
                event_desc = f"High intraday dispersion with rolling 30-day annualized volatility peaking at {v_val:.1f}%."

            peak_periods.append(VolatilityPeakPeriod(
                date=date_str,
                volatility_pct=round(v_val, 2),
                close_price=round(c_val, 2),
                daily_return_pct=round(r_val, 2),
                description=event_desc
            ))
            if len(peak_periods) >= 5:
                break

    # Build full time-series array for chart
    time_series: List[VolatilityPoint] = []
    for dt, c_val in close.items():
        date_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10]
        ret_val = daily_returns_pct.get(dt, None)
        vol_val = rolling_vol_30d.get(dt, None)

        time_series.append(VolatilityPoint(
            date=date_str,
            close=round(float(c_val), 2),
            daily_return_pct=round(float(ret_val), 2) if pd.notna(ret_val) else None,
            rolling_volatility_30d=round(float(vol_val), 2) if pd.notna(vol_val) else None,
        ))

    summary_text = (
        f"{symbol} is currently showing {risk_level.lower()} volatility at {current_vol:.2f}% annualized "
        f"(1-year average: {avg_vol:.2f}%). Historical volatility peaked at {max_vol:.2f}% "
        f"and reached a low of {min_vol:.2f}% over the past year."
    )

    try:
        stock_summary = get_stock_summary(symbol)
        comp_name = stock_summary.name
    except Exception:
        comp_name = symbol

    response = StockVolatilityResponse(
        symbol=symbol,
        company_name=comp_name,
        current_price=round(latest_close, 2),
        current_volatility=round(current_vol, 2),
        average_volatility=round(avg_vol, 2),
        max_volatility=round(max_vol, 2),
        min_volatility=round(min_vol, 2),
        risk_level=risk_level,
        highest_volatility_periods=peak_periods,
        time_series=time_series,
        summary=summary_text
    )

    volatility_cache[cache_key] = response
    return response


def compare_stocks_volatility(symbols: List[str]) -> WatchlistVolatilityComparisonResponse:
    """
    Computes and compares rolling 30-day annualized volatility across a list of stocks.
    """
    items: List[WatchlistVolatilityItem] = []
    vol_dict: Dict[str, float] = {}

    for sym in symbols:
        clean_sym = sym.strip().upper()
        if not clean_sym:
            continue
        try:
            vol_data = calculate_volatility_analysis(clean_sym, period="1y")
            # Calculate daily change
            stock_summary = get_stock_summary(clean_sym)
            daily_change = stock_summary.percent_change

            items.append(WatchlistVolatilityItem(
                symbol=clean_sym,
                name=vol_data.company_name,
                current_price=vol_data.current_price,
                current_volatility=vol_data.current_volatility,
                average_volatility=vol_data.average_volatility,
                max_volatility=vol_data.max_volatility,
                risk_level=vol_data.risk_level,
                daily_change_pct=daily_change
            ))
            vol_dict[clean_sym] = vol_data.current_volatility
        except Exception as e:
            continue

    if not items:
        raise ValueError("Could not compute volatility for any of the requested symbols.")

    # Sort descending by current volatility
    items.sort(key=lambda x: x.current_volatility, reverse=True)
    most_volatile = items[0].symbol if items else None
    least_volatile = items[-1].symbol if items else None
    avg_market_vol = float(np.mean([x.current_volatility for x in items]))

    summary = (
        f"Across the monitored assets, {most_volatile} displays the highest current volatility ({vol_dict[most_volatile]:.2f}%), "
        f"while {least_volatile} is the most stable ({vol_dict[least_volatile]:.2f}%). "
        f"The benchmark group average stands at {avg_market_vol:.2f}% annualized volatility."
    )

    return WatchlistVolatilityComparisonResponse(
        stocks=items,
        most_volatile=most_volatile,
        least_volatile=least_volatile,
        average_market_volatility=round(avg_market_vol, 2),
        summary=summary
    )

