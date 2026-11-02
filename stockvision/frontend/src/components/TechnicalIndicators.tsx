import React from 'react';
import { TrendAnalysisResponse } from '../types';

export const TechnicalIndicators: React.FC<{ data: TrendAnalysisResponse | null; isLoading?: boolean }> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-md p-6 h-48 flex items-center justify-center text-xs text-ink-muted">
        Evaluating technical indicators and trend classification...
      </div>
    );
  }

  if (!data) return null;

  const isBullish = data.trend === 'Bullish';
  const isBearish = data.trend === 'Bearish';

  return (
    <div className="bg-surface border border-border rounded-md p-5 space-y-4">
      {/* Header: Trend Verdict */}
      <div className="flex flex-wrap items-baseline justify-between border-b border-border pb-3 gap-2">
        <div className="flex items-baseline space-x-2.5">
          <span className="text-xs text-ink-muted font-medium">Trend classification:</span>
          <span
            className={`text-sm font-semibold flex items-center space-x-1 ${
              isBullish ? 'text-rise' : isBearish ? 'text-fall' : 'text-ink-muted'
            }`}
          >
            <span>{isBullish ? '↑ Bullish' : isBearish ? '↓ Bearish' : '→ Sideways'}</span>
          </span>
          <span className="text-xs text-ink-subtle">
            • {data.signal_strength}
          </span>
        </div>

        <div className="text-right">
          <span className="text-xs text-ink-muted mr-1.5">Settlement:</span>
          <span className="font-serif text-xl font-medium text-ink tabular-nums">
            ₹{data.current_price.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Editorial Plain-English Explanation */}
      {data.plain_english_explanation && (
        <div className="border-l-2 border-border pl-3 py-0.5 text-xs text-ink-muted leading-relaxed">
          {data.plain_english_explanation}
        </div>
      )}

      {/* Indicator Values Matrix */}
      <div className="border-t border-border pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs tabular-nums">
        <div className="space-y-0.5">
          <div className="text-[11px] text-ink-subtle">20-day SMA</div>
          <div className="font-semibold text-ink">₹{data.ma20 ? data.ma20.toFixed(2) : '—'}</div>
          <div className="text-[10px] text-ink-muted">
            {data.ma20 ? (data.current_price >= data.ma20 ? '↑ Above SMA' : '↓ Below SMA') : ''}
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[11px] text-ink-subtle">50-day SMA</div>
          <div className="font-semibold text-ink">₹{data.ma50 ? data.ma50.toFixed(2) : '—'}</div>
          <div className="text-[10px] text-ink-muted">
            {data.ma50 ? (data.current_price >= data.ma50 ? '↑ Above SMA' : '↓ Below SMA') : ''}
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[11px] text-ink-subtle">RSI (14)</div>
          <div className="font-semibold text-ink">
            {data.rsi_14 !== null && data.rsi_14 !== undefined ? data.rsi_14.toFixed(1) : '—'}
          </div>
          <div className="text-[10px] text-ink-muted">
            {(data.rsi_14 || 50) > 70 ? 'Overbought' : (data.rsi_14 || 50) < 30 ? 'Oversold' : 'Neutral band'}
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[11px] text-ink-subtle">10-day momentum</div>
          <div className={`font-semibold ${(data.momentum_10d_pct || 0) >= 0 ? 'text-rise' : 'text-fall'}`}>
            {(data.momentum_10d_pct || 0) >= 0 ? '↑ +' : '↓ '}{data.momentum_10d_pct?.toFixed(2) ?? '0.00'}%
          </div>
          <div className="text-[10px] text-ink-muted">Trailing return</div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[11px] text-ink-subtle">MACD</div>
          <div className="font-semibold text-ink">
            {data.macd !== null && data.macd !== undefined ? data.macd.toFixed(2) : '—'}
          </div>
          <div className="text-[10px] text-ink-muted">
            Sig: {data.macd_signal?.toFixed(2) ?? '—'}
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[11px] text-ink-subtle">Annualized volatility</div>
          <div className="font-semibold text-ink">
            {data.annualized_volatility?.toFixed(2) ?? '—'}%
          </div>
          <div className="text-[10px] text-ink-muted">30-day log std</div>
        </div>
      </div>

      {/* Analytical Reasoning Points */}
      {data.reasoning && data.reasoning.length > 0 && (
        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="text-[11px] text-ink-subtle font-medium">Technical rule diagnostics</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-muted">
            {data.reasoning.map((r, idx) => (
              <div key={idx} className="flex items-start space-x-1.5">
                <span className="text-ink-subtle">•</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
