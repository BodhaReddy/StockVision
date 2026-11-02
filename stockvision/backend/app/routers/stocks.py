from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas import (
    StockSearchResult,
    StockHistoryResponse,
    TrendAnalysisResponse,
    StockVolatilityResponse,
    WatchlistVolatilityComparisonResponse,
)
from app.services.yfinance_service import search_stocks, get_stock_history
from app.services.indicators import analyze_trend, calculate_volatility_analysis, compare_stocks_volatility
from ml.config import SYMBOLS

router = APIRouter(prefix="/stocks", tags=["stocks"])

@router.get("/search", response_model=List[StockSearchResult])
def search(q: str = Query(..., min_length=1, description="Query string for stock name or ticker")):
    try:
        results = search_stocks(q)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stock search failed: {str(e)}")

@router.get("/volatility/compare", response_model=WatchlistVolatilityComparisonResponse)
def get_volatility_comparison(symbols: Optional[str] = Query(None, description="Comma-separated ticker symbols")):
    try:
        if symbols:
            symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
        else:
            symbol_list = SYMBOLS
        
        if not symbol_list:
            symbol_list = SYMBOLS

        return compare_stocks_volatility(symbol_list)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compare volatility: {str(e)}")

@router.get("/{symbol}/history", response_model=StockHistoryResponse)
def get_history(symbol: str, period: str = Query("1Y", pattern="^(1M|3M|6M|1Y|5Y|1mo|3mo|6mo|1y|5y)$")):
    try:
        clean_symbol = symbol.strip().upper()
        history = get_stock_history(clean_symbol, period=period)
        return history
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stock history: {str(e)}")

@router.get("/{symbol}/trend", response_model=TrendAnalysisResponse)
def get_trend(symbol: str):
    try:
        clean_symbol = symbol.strip().upper()
        trend_data = analyze_trend(clean_symbol)
        return trend_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze trend: {str(e)}")

@router.get("/{symbol}/volatility", response_model=StockVolatilityResponse)
def get_volatility(symbol: str, period: str = Query("1Y", pattern="^(1M|3M|6M|1Y|2Y|5Y|1mo|3mo|6mo|1y|2y|5y)$")):
    try:
        clean_symbol = symbol.strip().upper()
        vol_data = calculate_volatility_analysis(clean_symbol, period=period)
        return vol_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute volatility: {str(e)}")
