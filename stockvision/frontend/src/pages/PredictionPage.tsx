import React, { useState, useEffect } from 'react';
import {
  Download,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { api } from '../services/api';
import { PredictResponse, ModelComparisonResponse } from '../types';
import { ForecastChart } from '../components/ForecastChart';
import { WatchlistButton } from '../components/WatchlistButton';
import { generateForecastPdfReport } from '../services/pdfReport';
import { NSE_STOCKS_28 } from '../constants/stocks';

const SYMBOLS = NSE_STOCKS_28;

type ModelType = 'lstm' | 'gru' | 'cnn';

const MODELS: { id: ModelType; label: string; description: string }[] = [
  {
    id: 'lstm',
    label: 'LSTM',
    description: 'Stacked 2-layer Long Short-Term Memory network with 60-day chronological feature memory.',
  },
  {
    id: 'gru',
    label: 'GRU',
    description: 'Gated Recurrent Unit network with lower parameter count and faster convergence.',
  },
  {
    id: 'cnn',
    label: '1D CNN',
    description: 'One-dimensional temporal convolutional network detecting local wave momentum and breakouts.',
  },
];

const HORIZONS = [
  { days: 1, label: '1 day' },
  { days: 5, label: '5 days' },
  { days: 10, label: '10 days' },
  { days: 30, label: '30 days' },
];

export const PredictionPage: React.FC = () => {
  const { selectedStock, setSelectedStock, stockName, setStockName } = useStock();
  const [model, setModel] = useState<ModelType>('lstm');
  const [horizon, setHorizon] = useState<number>(5);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [metrics, setMetrics] = useState<ModelComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch forecast and metrics when dependencies change
  const handlePredict = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [predResult, compResult] = await Promise.allSettled([
        api.predictStock({ symbol: selectedStock, model, horizon }),
        api.getModelComparison(selectedStock),
      ]);

      if (predResult.status === 'fulfilled') {
        setPrediction(predResult.value);
      } else {
        throw predResult.reason;
      }

      if (compResult.status === 'fulfilled') {
        setMetrics(compResult.value);
      } else {
        setMetrics(null);
      }
    } catch (err: any) {
      console.error('Prediction error:', err);
      setError(
        err.message || 'Predictions are not available for this stock yet. Check if models are trained.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handlePredict();
  }, [selectedStock, model, horizon]);

  const handleDownloadReport = async () => {
    if (!prediction) return;
    setIsGeneratingPdf(true);
    try {
      await generateForecastPdfReport({
        symbol: prediction.symbol,
        stockName,
        model: prediction.model,
        horizon: prediction.horizon,
        latestPrice: prediction.latest_close,
        predictedPrice: prediction.predicted_close,
        expectedChange: prediction.expected_change,
        expectedChangePct: prediction.expected_change_pct,
        direction: prediction.direction,
        forecast: prediction.forecast,
        metrics: metrics?.metrics[model],
        explanation: prediction.explanation,
      });
    } catch (err: any) {
      console.error('PDF export error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const selectedModelMeta = MODELS.find((m) => m.id === model) || MODELS[0];
  const isUp = (prediction?.expected_change ?? 0) > 0;
  const isDown = (prediction?.expected_change ?? 0) < 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Stock Bar */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-2xl md:text-3xl font-medium text-ink tracking-tight">
              {stockName}
            </h1>
            <span className="text-xs text-ink-muted">
              ({selectedStock.replace('.NS', '')})
            </span>
            <WatchlistButton symbol={selectedStock} />
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Deep learning sequential price forecast • 60-day feature window
          </p>
        </div>

        {/* Ticker Selector & Export Action */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedStock}
            onChange={(e) => {
              const stock = SYMBOLS.find((s) => s.symbol === e.target.value);
              if (stock) {
                setSelectedStock(stock.symbol);
                setStockName(stock.name);
              }
            }}
            className="px-2.5 py-1.5 rounded-sm text-xs bg-surface border border-border text-ink focus:outline-none focus:border-forecast focus:ring-1 focus:ring-forecast cursor-pointer"
          >
            {SYMBOLS.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol.replace('.NS', '')} – {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadReport}
            disabled={isGeneratingPdf || !prediction}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-surface border border-border hover:bg-surface-subtle text-ink text-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 text-ink-muted" />
            )}
            <span>Export report</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-sm bg-surface border border-fall/40 flex items-start space-x-2.5 text-xs text-fall">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice:</span> {error}
          </div>
        </div>
      )}

      {/* Main Element: Forecast Chart Full Width at Top */}
      {prediction ? (
        <div className="space-y-3">
          {/* Plain Text Figures Above the Chart */}
          <div className="flex flex-wrap items-baseline justify-between gap-y-2 text-ink">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <div>
                <span className="text-xs text-ink-muted mr-1.5">Forecast close:</span>
                <span className="font-serif text-3xl font-medium text-ink tabular-nums">
                  ₹{prediction.predicted_close.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="text-sm font-medium tabular-nums flex items-center space-x-1">
                {isUp ? (
                  <span className="text-rise">
                    ↑ +₹{prediction.expected_change.toFixed(2)} (+{prediction.expected_change_pct.toFixed(2)}% rise)
                  </span>
                ) : isDown ? (
                  <span className="text-fall">
                    ↓ -₹{Math.abs(prediction.expected_change).toFixed(2)} ({prediction.expected_change_pct.toFixed(2)}% fall)
                  </span>
                ) : (
                  <span className="text-ink-muted">
                    → ₹0.00 (flat)
                  </span>
                )}
              </div>

              <div className="text-xs text-ink-muted">
                Settled: <span className="tabular-nums font-medium text-ink">₹{prediction.latest_close.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-xs text-ink-muted">
              Horizon: <span className="font-medium text-ink">{prediction.horizon} trading sessions</span> • Model: <span className="font-medium text-ink uppercase">{prediction.model}</span>
            </div>
          </div>

          {/* Full Width Forecast Chart */}
          <ForecastChart
            historical={prediction.historical_context}
            forecast={prediction.forecast}
            symbol={prediction.symbol}
          />
        </div>
      ) : isLoading ? (
        <div className="h-88 w-full border border-border rounded-md bg-surface flex items-center justify-center space-x-2 text-xs text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin text-forecast" />
          <span>Generating multi-step forecast...</span>
        </div>
      ) : null}

      {/* Compact Controls: Segmented Model Control + Simple Horizon Option Row */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Control for Models */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-ink-muted font-medium mr-1">Model:</span>
            <div className="inline-flex rounded-sm border border-border bg-surface p-0.5 text-xs">
              {MODELS.map((m) => {
                const isActive = model === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`px-3 py-1 rounded-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-ink text-surface font-medium'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horizon Option Row */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-ink-muted font-medium mr-1">Horizon:</span>
            <div className="inline-flex rounded-sm border border-border bg-surface p-0.5 text-xs">
              {HORIZONS.map((h) => {
                const isActive = horizon === h.days;
                return (
                  <button
                    key={h.days}
                    onClick={() => setHorizon(h.days)}
                    className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-ink text-surface font-medium'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {h.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handlePredict}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-sm text-xs border border-border bg-surface hover:bg-surface-subtle text-ink font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Running...' : 'Recalculate'}
            </button>
          </div>
        </div>

        {/* One-Line Model Description */}
        <p className="text-xs text-ink-muted leading-relaxed">
          {selectedModelMeta.description}
        </p>
      </div>

      {/* Trajectory Schedule & Narrative Explanation */}
      {prediction && (
        <div className="border-t border-border pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Forecast Trajectory Schedule Table */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <span className="font-serif text-base text-ink font-medium">
                Forecast rollout schedule
              </span>
              <span className="text-[11px] text-ink-subtle">
                90% confidence range
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-[11px] text-ink-subtle">
                    <th className="py-2 pr-3 font-medium">Step</th>
                    <th className="py-2 px-3 font-medium">Date</th>
                    <th className="py-2 px-3 font-medium">Forecast</th>
                    <th className="py-2 px-3 font-medium">Lower</th>
                    <th className="py-2 px-3 font-medium">Upper</th>
                    <th className="py-2 pl-3 font-medium text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {prediction.forecast.map((fc) => {
                    const delta = fc.predicted_close - prediction.latest_close;
                    const deltaPct = (delta / prediction.latest_close) * 100;
                    const pos = delta >= 0;
                    return (
                      <tr key={fc.step} className="hover:bg-surface-subtle transition-colors tabular-nums">
                        <td className="py-2 pr-3 font-medium text-ink">+{fc.step}d</td>
                        <td className="py-2 px-3 text-ink-muted">{fc.date}</td>
                        <td className="py-2 px-3 font-semibold text-forecast">
                          ₹{fc.predicted_close.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-ink-subtle">₹{fc.lower_bound.toFixed(2)}</td>
                        <td className="py-2 px-3 text-ink-subtle">₹{fc.upper_bound.toFixed(2)}</td>
                        <td className={`py-2 pl-3 text-right font-medium ${pos ? 'text-rise' : 'text-fall'}`}>
                          {pos ? '↑ +' : '↓ '}{delta.toFixed(2)} ({deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: "Why this prediction?" Interpretability */}
          {prediction.explanation && (
            <div className="lg:col-span-6 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between pb-1 border-b border-border gap-2">
                <span className="font-serif text-base text-ink font-medium">
                  Why this prediction?
                </span>
                <span className="text-[11px] text-ink-muted">
                  {prediction.explanation.label}
                </span>
              </div>

              {/* Plain-Language Diagnostic Insights */}
              <div className="space-y-3 text-xs leading-relaxed text-ink-muted">
                <div>
                  <span className="font-medium text-ink">Recent price trend: </span>
                  <span>{prediction.explanation.recent_trend_summary}</span>
                </div>
                <div>
                  <span className="font-medium text-ink">Moving averages: </span>
                  <span>{prediction.explanation.moving_averages_context}</span>
                </div>
                <div>
                  <span className="font-medium text-ink">Volume flow: </span>
                  <span>{prediction.explanation.volume_change_context}</span>
                </div>
              </div>

              {/* Permutation Importance Across 60-Day Inputs */}
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-[11px] text-ink-subtle">
                  <span className="font-medium text-ink">Input channel sensitivity</span>
                  <span>Normalized gradient %</span>
                </div>

                <div className="space-y-1.5">
                  {prediction.explanation.feature_importance.map((f) => (
                    <div key={f.feature} className="space-y-0.5 text-xs">
                      <div className="flex justify-between tabular-nums">
                        <span className="font-medium text-ink">{f.feature}</span>
                        <span className="text-ink-muted">{f.importance_pct}%</span>
                      </div>
                      <div className="w-full bg-surface-subtle border border-border h-1 rounded-xs overflow-hidden">
                        <div
                          className="bg-forecast h-full rounded-xs"
                          style={{ width: `${Math.min(100, Math.max(3, f.importance_pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-ink-subtle pt-1">
                  Sensitivity across 60-day sequence inputs indicates feature influence, not economic causality.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quiet Single-Line Disclaimer */}
      <div className="pt-4 border-t border-border text-xs text-ink-subtle">
        {prediction?.disclaimer || 'Experimental forecasts for educational use, not investment advice.'}
      </div>
    </div>
  );
};
