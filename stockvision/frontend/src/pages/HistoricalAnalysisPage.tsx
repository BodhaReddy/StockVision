import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { api } from '../services/api';
import { StockHistoryResponse, TrendAnalysisResponse } from '../types';
import { HistoricalChart } from '../components/HistoricalChart';
import { TechnicalIndicators } from '../components/TechnicalIndicators';
import { WatchlistButton } from '../components/WatchlistButton';
import { NSE_STOCKS_28 } from '../constants/stocks';

const POPULAR_TICKERS = NSE_STOCKS_28.slice(0, 8);

export const HistoricalAnalysisPage: React.FC = () => {
  const { selectedStock, setSelectedStock, setStockName } = useStock();
  const [period, setPeriod] = useState<string>('1Y');
  const [historyData, setHistoryData] = useState<StockHistoryResponse | null>(null);
  const [trendData, setTrendData] = useState<TrendAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [hist, tr] = await Promise.all([
        api.getStockHistory(selectedStock, period),
        api.getTrendAnalysis(selectedStock),
      ]);
      setHistoryData(hist);
      setTrendData(tr);
      if (hist.summary.name) {
        setStockName(hist.summary.name);
      }
    } catch (err: any) {
      console.error('Error fetching stock data:', err);
      setError(err.message || 'Failed to fetch historical stock data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStock, period, setStockName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = historyData?.summary;
  const isPositive = (summary?.change ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Stock Switcher */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-2xl md:text-3xl font-medium text-ink tracking-tight">
              {summary ? summary.name : selectedStock}
            </h1>
            <span className="text-xs text-ink-muted">
              ({selectedStock.replace('.NS', '')})
            </span>
            <WatchlistButton symbol={selectedStock} />
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Indian National Stock Exchange (NSE) • Historical market analytics
          </p>
        </div>

        {/* Stock Selector Dropdown & Quick Pills */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedStock}
            onChange={(e) => {
              const stock = NSE_STOCKS_28.find((s) => s.symbol === e.target.value);
              if (stock) {
                setSelectedStock(stock.symbol);
                setStockName(stock.name);
              }
            }}
            className="px-2.5 py-1.5 rounded-sm text-xs bg-surface border border-border text-ink focus:outline-none focus:border-forecast focus:ring-1 focus:ring-forecast cursor-pointer"
          >
            {NSE_STOCKS_28.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol.replace('.NS', '')} – {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchData}
            title="Refresh data"
            className="p-1.5 rounded-sm bg-surface border border-border hover:bg-surface-subtle text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-sm bg-surface border border-fall/40 flex items-start space-x-2.5 text-xs text-fall">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice:</span> {error}
            <button
              onClick={fetchData}
              className="ml-2 underline font-medium hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Summary Metrics Bar in Plain Typography */}
      {summary && (
        <div className="flex flex-wrap items-baseline justify-between gap-y-3 gap-x-6 text-xs text-ink border-b border-border pb-4 tabular-nums">
          <div>
            <div className="text-[11px] text-ink-subtle">Last close</div>
            <div className="font-serif text-3xl font-medium text-ink mt-0.5">
              ₹{summary.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-medium mt-0.5 ${isPositive ? 'text-rise' : 'text-fall'}`}>
              {isPositive ? '↑ +' : '↓ '}{summary.change.toFixed(2)} ({isPositive ? '+' : ''}{summary.percent_change.toFixed(2)}% {isPositive ? 'up' : 'down'} today)
            </div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">Day range</div>
            <div className="font-medium text-ink mt-1">
              ₹{summary.low.toFixed(2)} – ₹{summary.high.toFixed(2)}
            </div>
            <div className="text-ink-muted text-[11px] mt-0.5">Open: ₹{summary.open.toFixed(2)}</div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">Prior close</div>
            <div className="font-medium text-ink mt-1">
              ₹{summary.previous_close.toFixed(2)}
            </div>
            <div className="text-ink-muted text-[11px] mt-0.5">Settlement basis</div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">52-week range</div>
            <div className="font-medium text-ink mt-1">
              ₹{(summary.fifty_two_week_low ?? 0).toFixed(2)} – ₹{(summary.fifty_two_week_high ?? 0).toFixed(2)}
            </div>
            <div className="text-ink-muted text-[11px] mt-0.5">Annual extremes</div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">Volume & valuation</div>
            <div className="font-medium text-ink mt-1">
              {summary.volume ? summary.volume.toLocaleString() : '—'}
            </div>
            <div className="text-ink-muted text-[11px] mt-0.5">
              P/E: {summary.pe_ratio ? summary.pe_ratio.toFixed(1) : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Main Historical Area Chart */}
      <HistoricalChart
        data={historyData?.data || []}
        period={period}
        onPeriodChange={setPeriod}
        isLoading={isLoading}
      />

      {/* Technical Trend & Indicators Assessment */}
      <TechnicalIndicators data={trendData} isLoading={isLoading} />
    </div>
  );
};
