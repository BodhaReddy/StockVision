import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { StockHistoricalPoint, ForecastPoint } from '../types';

interface ForecastChartProps {
  historical: StockHistoricalPoint[];
  forecast: ForecastPoint[];
  symbol: string;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  historical,
  forecast,
  symbol,
}) => {
  const combinedData: any[] = [];
  const visibleHistorical = historical.slice(-35);
  let bridgeDate = '';

  visibleHistorical.forEach((pt) => {
    combinedData.push({
      date: pt.date,
      actual: pt.close,
      forecast: null,
      lower: null,
      upper: null,
      type: 'historical',
    });
  });

  if (visibleHistorical.length > 0 && forecast.length > 0) {
    const bridgePoint = visibleHistorical[visibleHistorical.length - 1];
    bridgeDate = bridgePoint.date;
    // Overwrite bridge point so the forecast line connects continuously without a gap
    combinedData[combinedData.length - 1].forecast = bridgePoint.close;
    combinedData[combinedData.length - 1].lower = bridgePoint.close;
    combinedData[combinedData.length - 1].upper = bridgePoint.close;

    forecast.forEach((fc) => {
      combinedData.push({
        date: fc.date,
        actual: null,
        forecast: fc.predicted_close,
        lower: fc.lower_bound,
        upper: fc.upper_bound,
        type: 'forecast',
        step: fc.step,
      });
    });
  }

  // Calculate Y bounds
  const allValues = [
    ...visibleHistorical.map((d) => d.close),
    ...forecast.flatMap((f) => [f.predicted_close, f.lower_bound, f.upper_bound]),
  ].filter((v) => typeof v === 'number' && !isNaN(v));

  const minY = allValues.length ? Math.floor(Math.min(...allValues) * 0.98) : 0;
  const maxY = allValues.length ? Math.ceil(Math.max(...allValues) * 1.02) : 100;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const isFc = dataPoint.type === 'forecast';

      return (
        <div className="bg-surface border border-border p-2.5 rounded-sm shadow-sm text-xs space-y-1 text-ink tabular-nums">
          <div className="text-[11px] text-ink-muted pb-1 border-b border-border flex justify-between space-x-3">
            <span>{label}</span>
            <span>{isFc ? `Forecast day +${dataPoint.step}` : 'Actual close'}</span>
          </div>

          {dataPoint.actual !== null && (
            <div className="flex justify-between space-x-3">
              <span className="text-ink-muted">Historical:</span>
              <span className="font-medium text-ink">₹{dataPoint.actual.toFixed(2)}</span>
            </div>
          )}

          {dataPoint.forecast !== null && isFc && (
            <>
              <div className="flex justify-between space-x-3">
                <span className="text-forecast">Forecast:</span>
                <span className="font-semibold text-forecast">₹{dataPoint.forecast.toFixed(2)}</span>
              </div>
              {dataPoint.lower !== null && dataPoint.upper !== null && (
                <div className="flex justify-between space-x-3 text-[11px] text-ink-subtle">
                  <span>90% range:</span>
                  <span>₹{dataPoint.lower.toFixed(2)} – ₹{dataPoint.upper.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="forecast-chart-card" className="w-full bg-surface border border-border rounded-md p-5 space-y-3">
      {/* Legend & Meta Row */}
      <div className="flex flex-wrap items-center justify-between text-xs text-ink-muted border-b border-border pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-ink">Sequential price trajectory</span>
          <span className="text-ink-subtle">({symbol.replace('.NS', '')})</span>
        </div>

        <div className="flex items-center space-x-4 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-[2px] bg-ink inline-block"></span>
            <span>Actual close</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-0 border-t-2 border-dashed border-forecast inline-block"></span>
            <span className="text-forecast font-medium">Forecast</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2 bg-forecast/15 border border-forecast/30 inline-block rounded-xs"></span>
            <span>90% confidence band</span>
          </div>
        </div>
      </div>

      <div className="h-88 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" strokeOpacity={0.7} vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--color-ink-subtle)"
              fontSize={11}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[minY, maxY]}
              stroke="var(--color-ink-subtle)"
              fontSize={11}
              tickLine={false}
              orientation="right"
              tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Subtle Forecast Origin Marker */}
            {bridgeDate && (
              <ReferenceLine
                x={bridgeDate}
                stroke="var(--color-ink-subtle)"
                strokeDasharray="2 2"
                label={{
                  value: 'Forecast origin',
                  position: 'top',
                  fill: 'var(--color-ink-muted)',
                  fontSize: 10,
                }}
              />
            )}

            {/* Soft Shaded Forecast Uncertainty Band */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="var(--color-forecast)"
              fillOpacity={0.12}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="var(--color-surface)"
              fillOpacity={1}
              isAnimationActive={false}
            />

            {/* Historical Actual: Solid Line in Deep Ink */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--color-ink)"
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />

            {/* Forecast: Dashed Line in Cobalt Blue with subtle dots */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="var(--color-forecast)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 2.5, fill: 'var(--color-forecast)', strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
