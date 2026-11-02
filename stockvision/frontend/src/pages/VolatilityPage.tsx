import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Cell,
} from 'recharts';
import { useStock } from '../context/StockContext';
import { api } from '../services/api';
import {
  StockVolatilityResponse,
  WatchlistVolatilityComparisonResponse,
  WatchlistVolatilityItem,
} from '../types';
import { WatchlistButton } from '../components/WatchlistButton';
import { NSE_STOCKS_28 } from '../constants/stocks';

const POPULAR_TICKERS = NSE_STOCKS_28.slice(0, 8);

export const VolatilityPage: React.FC = () => {
  const { selectedStock, setSelectedStock, setStockName } = useStock();
  const [period, setPeriod] = useState<string>('1Y');
  const [volatilityData, setVolatilityData] = useState<StockVolatilityResponse | null>(null);
  const [comparisonData, setComparisonData] = useState<WatchlistVolatilityComparisonResponse | null>(null);
  const [showDailyReturns, setShowDailyReturns] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCompLoading, setIsCompLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStockVolatility = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getStockVolatility(selectedStock, period);
      setVolatilityData(data);
    } catch (err: any) {
      console.error('Error fetching volatility data:', err);
      setError(err.message || 'Failed to compute volatility analysis');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStock, period]);

  const fetchComparison = useCallback(async () => {
    setIsCompLoading(true);
    try {
      const comp = await api.getVolatilityComparison();
      setComparisonData(comp);
    } catch (err: any) {
      console.error('Error fetching volatility comparison:', err);
    } finally {
      setIsCompLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockVolatility();
  }, [fetchStockVolatility]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low':
        return 'var(--color-rise)';
      case 'Moderate':
        return '#D97706';
      case 'Elevated':
      case 'High':
        return 'var(--color-fall)';
      default:
        return 'var(--color-ink-muted)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Stock Switcher */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-2xl md:text-3xl font-medium text-ink tracking-tight">
              Volatility analysis
            </h1>
            <span className="text-xs text-ink-muted">
              ({selectedStock.replace('.NS', '')})
            </span>
            <WatchlistButton symbol={selectedStock} />
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Rolling 30-day annualized historical volatility • Return dispersion and cross-asset risk
          </p>
        </div>

        {/* Stock Selector & Timeframe Controls */}
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Timeframe Segmented Control */}
          <div className="inline-flex rounded-sm border border-border bg-surface p-0.5 text-xs">
            {['6M', '1Y', '2Y'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                  period === p
                    ? 'bg-ink text-surface font-medium'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              fetchStockVolatility();
              fetchComparison();
            }}
            disabled={isLoading}
            className="p-1.5 rounded-sm bg-surface border border-border hover:bg-surface-subtle text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-sm bg-surface border border-fall/40 flex items-start space-x-2.5 text-xs text-fall">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Plain Typography Row */}
      {volatilityData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-border pb-4 text-xs tabular-nums">
          <div>
            <div className="text-[11px] text-ink-subtle">Current 30D volatility</div>
            <div className="font-serif text-3xl font-medium text-ink mt-0.5">
              {volatilityData.current_volatility.toFixed(2)}%
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Annualized ({volatilityData.risk_level.toLowerCase()} risk tier)
            </div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">Period average</div>
            <div className="font-serif text-3xl font-medium text-ink mt-0.5">
              {volatilityData.average_volatility.toFixed(2)}%
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              {volatilityData.current_volatility > volatilityData.average_volatility ? (
                <span className="text-fall">
                  ↑ +{(volatilityData.current_volatility - volatilityData.average_volatility).toFixed(1)}% above average
                </span>
              ) : (
                <span className="text-rise">
                  ↓ -{(volatilityData.average_volatility - volatilityData.current_volatility).toFixed(1)}% below average
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">Peak 30D spike</div>
            <div className="font-serif text-3xl font-medium text-fall mt-0.5">
              {volatilityData.max_volatility.toFixed(2)}%
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Maximum historical dispersion
            </div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">Minimum compression</div>
            <div className="font-serif text-3xl font-medium text-rise mt-0.5">
              {volatilityData.min_volatility.toFixed(2)}%
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Trough compression level
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Note */}
      {volatilityData && (
        <div className="border-l-2 border-border pl-3 text-xs text-ink-muted leading-relaxed">
          {volatilityData.summary}
        </div>
      )}

      {/* Rolling Volatility Trajectory Chart */}
      <div className="bg-surface border border-border rounded-md p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <span className="font-serif text-base text-ink font-medium">
              Rolling 30-day volatility trajectory
            </span>
            <p className="text-xs text-ink-muted mt-0.5">
              Standard deviation of daily log-returns annualized by √252
            </p>
          </div>

          <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-ink-muted select-none">
            <input
              type="checkbox"
              checked={showDailyReturns}
              onChange={(e) => setShowDailyReturns(e.target.checked)}
              className="rounded-xs border-border text-forecast focus:ring-forecast"
            />
            <span>Show daily returns</span>
          </label>
        </div>

        <div className="h-80 w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-ink-muted">
              Computing rolling volatility...
            </div>
          ) : volatilityData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={volatilityData.time_series}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" strokeOpacity={0.7} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--color-ink-subtle)' }}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  yAxisId="vol"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: 'var(--color-ink-subtle)' }}
                  tickLine={false}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                {showDailyReturns && (
                  <YAxis
                    yAxisId="ret"
                    orientation="right"
                    domain={[-10, 10]}
                    tick={{ fontSize: 10, fill: 'var(--color-ink-subtle)' }}
                    tickLine={false}
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                  />
                )}
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload;
                      return (
                        <div className="bg-surface border border-border p-2.5 rounded-sm shadow-sm text-xs space-y-1 text-ink tabular-nums">
                          <div className="text-[11px] text-ink-muted pb-1 border-b border-border flex justify-between space-x-3">
                            <span>{label}</span>
                            <span>₹{dataPoint.close.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between space-x-3 text-forecast">
                            <span>30D Volatility:</span>
                            <span className="font-semibold">{dataPoint.rolling_volatility_30d ? `${dataPoint.rolling_volatility_30d.toFixed(2)}%` : '—'}</span>
                          </div>
                          {dataPoint.daily_return_pct !== undefined && dataPoint.daily_return_pct !== null && (
                            <div className="flex justify-between space-x-3">
                              <span className="text-ink-muted">Daily Return:</span>
                              <span
                                className={`font-medium ${
                                  dataPoint.daily_return_pct >= 0 ? 'text-rise' : 'text-fall'
                                }`}
                              >
                                {dataPoint.daily_return_pct >= 0 ? '↑ +' : '↓ '}{dataPoint.daily_return_pct.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <ReferenceLine
                  yAxisId="vol"
                  y={volatilityData.average_volatility}
                  stroke="var(--color-ink-subtle)"
                  strokeDasharray="3 3"
                  label={{
                    value: `Avg: ${volatilityData.average_volatility.toFixed(1)}%`,
                    fill: 'var(--color-ink-muted)',
                    fontSize: 10,
                    position: 'insideTopLeft',
                  }}
                />

                {showDailyReturns && (
                  <Bar
                    yAxisId="ret"
                    dataKey="daily_return_pct"
                    fill="var(--color-ink-muted)"
                    opacity={0.3}
                    name="Daily Return %"
                  />
                )}

                <Line
                  yAxisId="vol"
                  type="monotone"
                  dataKey="rolling_volatility_30d"
                  stroke="var(--color-forecast)"
                  strokeWidth={1.75}
                  dot={false}
                  name="30D Annualized Volatility"
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {/* Highest Volatility Periods Table */}
      {volatilityData && volatilityData.highest_volatility_periods.length > 0 && (
        <div className="border-t border-border pt-6 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <span className="font-serif text-base text-ink font-medium">
              Historical volatility shock periods
            </span>
            <span className="text-[11px] text-ink-subtle">
              Top {volatilityData.highest_volatility_periods.length} outliers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-[11px] text-ink-subtle">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 px-3 font-medium">Price</th>
                  <th className="py-2 px-3 font-medium">Daily return</th>
                  <th className="py-2 px-3 font-medium">30-day annualized vol</th>
                  <th className="py-2 pl-3 font-medium">Context note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {volatilityData.highest_volatility_periods.map((p, idx) => {
                  const isPos = (p.daily_return_pct ?? 0) >= 0;
                  return (
                    <tr key={idx} className="hover:bg-surface-subtle transition-colors tabular-nums">
                      <td className="py-2 pr-3 font-medium text-ink">{p.date}</td>
                      <td className="py-2 px-3 text-ink">₹{p.close_price.toFixed(2)}</td>
                      <td className={`py-2 px-3 font-medium ${isPos ? 'text-rise' : 'text-fall'}`}>
                        {isPos ? '↑ +' : '↓ '}{p.daily_return_pct ? p.daily_return_pct.toFixed(2) : '0.00'}%
                      </td>
                      <td className="py-2 px-3 font-semibold text-fall">
                        {p.volatility_pct.toFixed(1)}%
                      </td>
                      <td className="py-2 pl-3 text-ink-muted text-[11px] leading-tight">
                        {p.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Watchlist Volatility Benchmark */}
      {comparisonData && (
        <div className="border-t border-border pt-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between border-b border-border pb-3 gap-2">
            <div>
              <span className="font-serif text-base text-ink font-medium">
                Watchlist risk benchmark
              </span>
              <p className="text-xs text-ink-muted mt-0.5">
                Cross-asset annualized volatility comparison
              </p>
            </div>

            <div className="text-xs text-ink-muted flex items-center space-x-3">
              <span>Most stable: <strong className="text-rise font-medium">{comparisonData.least_volatile?.replace('.NS', '') || '—'}</strong></span>
              <span>•</span>
              <span>Most volatile: <strong className="text-fall font-medium">{comparisonData.most_volatile?.replace('.NS', '') || '—'}</strong></span>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-[11px] text-ink-subtle">
                  <th className="py-2 pr-3 font-medium">Ticker</th>
                  <th className="py-2 px-3 font-medium">Current price</th>
                  <th className="py-2 px-3 font-medium">1-day change</th>
                  <th className="py-2 px-3 font-medium">Current 30D vol</th>
                  <th className="py-2 px-3 font-medium">1-year avg</th>
                  <th className="py-2 px-3 font-medium">Peak spike</th>
                  <th className="py-2 pl-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonData.stocks.map((s) => {
                  const isSelected = s.symbol === selectedStock;
                  const isPos = s.daily_change_pct >= 0;
                  return (
                    <tr
                      key={s.symbol}
                      className={`hover:bg-surface-subtle transition-colors tabular-nums ${
                        isSelected ? 'bg-surface-subtle font-medium' : ''
                      }`}
                    >
                      <td className="py-2 pr-3">
                        <span className="font-medium text-ink">{s.symbol.replace('.NS', '')}</span>
                        <span className="text-[11px] text-ink-muted ml-1.5 hidden sm:inline">({s.name?.split(' ')[0]})</span>
                      </td>
                      <td className="py-2 px-3 font-medium text-ink">₹{s.current_price.toFixed(2)}</td>
                      <td className={`py-2 px-3 ${isPos ? 'text-rise' : 'text-fall'}`}>
                        {isPos ? '↑ +' : '↓ '}{s.daily_change_pct.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 font-semibold text-ink">
                        {s.current_volatility.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-ink-muted">{s.average_volatility.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-fall">{s.max_volatility.toFixed(1)}%</td>
                      <td className="py-2 pl-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedStock(s.symbol);
                            if (s.name) setStockName(s.name);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`px-2 py-0.5 rounded-sm text-[11px] border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-ink text-surface border-ink'
                              : 'bg-surface border-border text-ink-muted hover:text-ink hover:bg-surface-subtle'
                          }`}
                        >
                          {isSelected ? 'Active' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quiet Single-Line Academic Disclaimer */}
      <div className="pt-4 border-t border-border text-xs text-ink-subtle">
        Experimental volatility analytics for educational use, not investment advice.
      </div>
    </div>
  );
};
