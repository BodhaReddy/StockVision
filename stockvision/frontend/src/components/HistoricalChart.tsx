import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { StockHistoricalPoint } from '../types';

interface HistoricalChartProps {
  data: StockHistoricalPoint[];
  period: string;
  onPeriodChange: (p: string) => void;
  isLoading?: boolean;
}

const PERIODS = ['1M', '3M', '6M', '1Y', '5Y'];

export const HistoricalChart: React.FC<HistoricalChartProps> = ({
  data,
  period,
  onPeriodChange,
  isLoading,
}) => {
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);

  const prices = data.map((d) => d.close);
  const minPrice = prices.length ? Math.floor(Math.min(...prices) * 0.98) : 0;
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices) * 1.02) : 100;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as StockHistoricalPoint;
      return (
        <div className="bg-surface border border-border p-2.5 rounded-sm shadow-sm text-xs space-y-1 text-ink tabular-nums">
          <div className="text-[11px] text-ink-muted pb-1 border-b border-border flex justify-between space-x-3">
            <span>{label}</span>
            <span>NSE close</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-0.5">
            <div>
              <span className="text-ink-muted">Close:</span>{' '}
              <span className="font-semibold text-ink">₹{point.close.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-ink-muted">Open:</span>{' '}
              <span className="text-ink">₹{point.open.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-ink-muted">High:</span>{' '}
              <span className="text-rise font-medium">₹{point.high.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-ink-muted">Low:</span>{' '}
              <span className="text-fall font-medium">₹{point.low.toFixed(2)}</span>
            </div>
            {point.ma20 && showMA20 && (
              <div>
                <span className="text-forecast">SMA 20:</span>{' '}
                <span className="text-ink">₹{point.ma20.toFixed(2)}</span>
              </div>
            )}
            {point.ma50 && showMA50 && (
              <div>
                <span className="text-ink-muted">SMA 50:</span>{' '}
                <span className="text-ink">₹{point.ma50.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-border pt-1 text-[11px] text-ink-subtle">
            Volume: <span className="text-ink">{point.volume.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface border border-border rounded-md p-5 space-y-4">
      {/* Chart Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        {/* Period Selector: Segmented Control */}
        <div className="inline-flex rounded-sm border border-border bg-surface p-0.5 text-xs">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
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

        {/* Indicator Toggles */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setShowMA20(!showMA20)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-sm border transition-colors cursor-pointer ${
              showMA20
                ? 'bg-surface-subtle text-ink border-border font-medium'
                : 'text-ink-subtle border-transparent hover:text-ink'
            }`}
          >
            <span className="w-2.5 h-[2px] bg-forecast inline-block"></span>
            <span>20-day SMA</span>
          </button>

          <button
            onClick={() => setShowMA50(!showMA50)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-sm border transition-colors cursor-pointer ${
              showMA50
                ? 'bg-surface-subtle text-ink border-border font-medium'
                : 'text-ink-subtle border-transparent hover:text-ink'
            }`}
          >
            <span className="w-2.5 h-[2px] bg-ink-muted inline-block"></span>
            <span>50-day SMA</span>
          </button>
        </div>
      </div>

      {/* Main Price Area Chart */}
      <div className="h-72 w-full relative">
        {isLoading && (
          <div className="absolute inset-0 bg-surface/70 backdrop-blur-xs flex items-center justify-center z-10 text-xs text-ink-muted">
            Loading historical data...
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" strokeOpacity={0.7} vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--color-ink-subtle)"
              fontSize={11}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              stroke="var(--color-ink-subtle)"
              fontSize={11}
              tickLine={false}
              orientation="right"
              tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke="var(--color-ink)"
              strokeWidth={1.75}
              fill="var(--color-ink)"
              fillOpacity={0.04}
              isAnimationActive={false}
            />
            {showMA20 && (
              <Area
                type="monotone"
                dataKey="ma20"
                stroke="var(--color-forecast)"
                strokeWidth={1.5}
                dot={false}
                fill="none"
                isAnimationActive={false}
              />
            )}
            {showMA50 && (
              <Area
                type="monotone"
                dataKey="ma50"
                stroke="var(--color-ink-muted)"
                strokeWidth={1.5}
                dot={false}
                fill="none"
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Bar Chart */}
      <div className="border-t border-border pt-2">
        <div className="flex items-center justify-between text-[11px] text-ink-subtle mb-1">
          <span>Daily volume</span>
        </div>
        <div className="h-20 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <YAxis hide orientation="right" />
              <XAxis dataKey="date" hide />
              <Bar dataKey="volume" fill="var(--color-ink-muted)" opacity={0.35} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
