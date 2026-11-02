import time
import logging
from typing import List, Dict, Any, Optional
from cachetools import TTLCache
import pandas as pd
import numpy as np
import yfinance as yf
from app.config import settings
from app.schemas import StockSearchResult, StockSummary, StockHistoricalPoint, StockHistoryResponse
from ml.config import SYMBOLS, SEQUENCE_LENGTH

logger = logging.getLogger(__name__)

# In-memory caches with TTL to respect Yahoo Finance rate limits
history_cache = TTLCache(maxsize=settings.CACHE_MAXSIZE, ttl=settings.CACHE_TTL_HISTORY_SECONDS)
summary_cache = TTLCache(maxsize=settings.CACHE_MAXSIZE, ttl=settings.CACHE_TTL_SEARCH_SECONDS)

# Curated list of popular Indian NSE tickers (28 major stocks)
NSE_STOCKS: List[Dict[str, str]] = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd.", "sector": "Energy / Conglomerate"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd.", "sector": "Information Technology"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd.", "sector": "Banking & Financial Services"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Ltd.", "sector": "Banking & Financial Services"},
    {"symbol": "INFY.NS", "name": "Infosys Ltd.", "sector": "Information Technology"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd.", "sector": "Telecommunications"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "sector": "Public Sector Banking"},
    {"symbol": "ITC.NS", "name": "ITC Ltd.", "sector": "Consumer Goods / FMCG"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever Ltd.", "sector": "FMCG"},
    {"symbol": "LT.NS", "name": "Larsen & Toubro Ltd.", "sector": "Construction & Engineering"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd.", "sector": "Financial Services / NBFC"},
    {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank Ltd.", "sector": "Banking & Financial Services"},
    {"symbol": "AXISBANK.NS", "name": "Axis Bank Ltd.", "sector": "Banking & Financial Services"},
    {"symbol": "MARUTI.NS", "name": "Maruti Suzuki India Ltd.", "sector": "Automobile"},
    {"symbol": "SUNPHARMA.NS", "name": "Sun Pharmaceutical Industries Ltd.", "sector": "Healthcare / Pharma"},
    {"symbol": "TITAN.NS", "name": "Titan Company Ltd.", "sector": "Consumer Discretionary"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints Ltd.", "sector": "Consumer Goods / Paints"},
    {"symbol": "NTPC.NS", "name": "NTPC Ltd.", "sector": "Utilities / Power Generation"},
    {"symbol": "POWERGRID.NS", "name": "Power Grid Corporation of India Ltd.", "sector": "Utilities / Transmission"},
    {"symbol": "ONGC.NS", "name": "Oil & Natural Gas Corporation Ltd.", "sector": "Energy / Oil & Gas"},
    {"symbol": "TATASTEEL.NS", "name": "Tata Steel Ltd.", "sector": "Metals & Mining"},
    {"symbol": "M&M.NS", "name": "Mahindra & Mahindra Ltd.", "sector": "Automobile / Agriculture"},
    {"symbol": "ADANIENT.NS", "name": "Adani Enterprises Ltd.", "sector": "Commodities & Infrastructure"},
    {"symbol": "WIPRO.NS", "name": "Wipro Ltd.", "sector": "Information Technology"},
    {"symbol": "COALINDIA.NS", "name": "Coal India Ltd.", "sector": "Energy / Mining"},
    {"symbol": "HCLTECH.NS", "name": "HCL Technologies Ltd.", "sector": "Information Technology"},
    {"symbol": "BAJAJ-AUTO.NS", "name": "Bajaj Auto Ltd.", "sector": "Automobile / 2-Wheelers"},
    {"symbol": "ULTRACEMCO.NS", "name": "UltraTech Cement Ltd.", "sector": "Cement & Building Materials"},
]

PERIOD_MAP = {
    "1M": "1mo",
    "3M": "3mo",
    "6M": "6mo",
    "1Y": "1y",
    "5Y": "5y",
    "1mo": "1mo",
    "3mo": "3mo",
    "6mo": "6mo",
    "1y": "1y",
    "5y": "5y",
}

def search_stocks(query: str) -> List[StockSearchResult]:
    """Search Indian NSE stocks matching the query."""
    q = query.strip().upper()
    results = []
    
    # 1. Match from curated list
    for item in NSE_STOCKS:
        if q in item["symbol"].upper() or q in item["name"].upper() or (item["sector"] and q in item["sector"].upper()):
            results.append(StockSearchResult(
                symbol=item["symbol"],
                name=item["name"],
                exchange="NSE",
                sector=item.get("sector")
            ))
            
    # If query is a valid-looking symbol not in list, provide quick option
    if q and not any(r.symbol == q for r in results):
        if not q.endswith(".NS") and not q.endswith(".BO"):
            symbol_ns = f"{q}.NS"
        else:
            symbol_ns = q
        results.append(StockSearchResult(
            symbol=symbol_ns,
            name=f"{q} (NSE Equity)",
            exchange="NSE",
            sector="Equity"
        ))
        
    return results

def get_stock_summary(symbol: str) -> StockSummary:
    """Fetch recent summary metrics for a stock."""
    if symbol in summary_cache:
        return summary_cache[symbol]
        
    ticker = yf.Ticker(symbol)
    try:
        # Fast info preferred in newer yfinance versions
        fast_info = getattr(ticker, "fast_info", None)
        info = getattr(ticker, "info", {}) or {}
    except Exception as e:
        logger.warning(f"Error fetching info for {symbol}: {e}")
        fast_info = None
        info = {}

    # Get recent 5 days of history for live price and change
    hist = ticker.history(period="5d")
    if hist.empty:
        raise ValueError(f"No historical data available for symbol '{symbol}'")
        
    current_price = float(hist["Close"].iloc[-1])
    prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current_price
    change = current_price - prev_close
    percent_change = (change / prev_close * 100.0) if prev_close else 0.0
    
    day_open = float(hist["Open"].iloc[-1])
    day_high = float(hist["High"].iloc[-1])
    day_low = float(hist["Low"].iloc[-1])
    volume = int(hist["Volume"].iloc[-1])
    
    # Extract fundamentals
    pe = info.get("trailingPE") or info.get("forwardPE")
    market_cap = getattr(fast_info, "market_cap", None) or info.get("marketCap")
    year_high = getattr(fast_info, "year_high", None) or info.get("fiftyTwoWeekHigh")
    year_low = getattr(fast_info, "year_low", None) or info.get("fiftyTwoWeekLow")
    short_name = info.get("shortName") or info.get("longName") or symbol

    summary = StockSummary(
        symbol=symbol,
        name=short_name,
        current_price=round(current_price, 2),
        change=round(change, 2),
        percent_change=round(percent_change, 2),
        open=round(day_open, 2),
        high=round(day_high, 2),
        low=round(day_low, 2),
        previous_close=round(prev_close, 2),
        volume=volume,
        pe_ratio=round(pe, 2) if pe else None,
        market_cap=float(market_cap) if market_cap else None,
        fifty_two_week_high=round(float(year_high), 2) if year_high else None,
        fifty_two_week_low=round(float(year_low), 2) if year_low else None,
        currency="INR"
    )
    
    summary_cache[symbol] = summary
    return summary

def get_stock_history(symbol: str, period: str = "1Y") -> StockHistoryResponse:
    """Fetch OHLCV data and calculate 20/50 day moving averages."""
    cache_key = f"{symbol}_{period}"
    if cache_key in history_cache:
        return history_cache[cache_key]

    yf_period = PERIOD_MAP.get(period.upper(), "1y")
    ticker = yf.Ticker(symbol)
    
    # Fetch extra buffer history so MA20 and MA50 are populated at the start
    hist = ticker.history(period=yf_period)
    if hist.empty:
        raise ValueError(f"No historical data found for {symbol} with period {period}")
        
    df = hist.copy()
    df.reset_index(inplace=True)
    
    # Handle Date or Datetime column
    date_col = "Date" if "Date" in df.columns else "Datetime"
    
    # Calculate Moving Averages
    df["MA20"] = df["Close"].rolling(window=20).mean()
    df["MA50"] = df["Close"].rolling(window=50).mean()
    
    data_points: List[StockHistoricalPoint] = []
    for _, row in df.iterrows():
        dt = row[date_col]
        date_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10]
        data_points.append(StockHistoricalPoint(
            date=date_str,
            open=round(float(row["Open"]), 2),
            high=round(float(row["High"]), 2),
            low=round(float(row["Low"]), 2),
            close=round(float(row["Close"]), 2),
            volume=int(row["Volume"]),
            ma20=round(float(row["MA20"]), 2) if pd.notna(row["MA20"]) else None,
            ma50=round(float(row["MA50"]), 2) if pd.notna(row["MA50"]) else None,
        ))

    summary = get_stock_summary(symbol)
    response = StockHistoryResponse(
        symbol=symbol,
        period=period,
        summary=summary,
        data=data_points
    )
    
    history_cache[cache_key] = response
    return response

def get_raw_history_df(symbol: str, period: str = "3y") -> pd.DataFrame:
    """Fetch raw OHLCV DataFrame for ML training and feature extraction."""
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period)
    if df.empty:
        raise ValueError(f"Could not retrieve history for {symbol}")
    df = df[["Open", "High", "Low", "Close", "Volume"]].dropna()
    return df

