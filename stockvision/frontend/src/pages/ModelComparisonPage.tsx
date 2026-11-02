import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useStock } from '../context/StockContext';
import { api } from '../services/api';
import { ModelComparisonResponse } from '../types';
import { NSE_STOCKS_28 } from '../constants/stocks';

const SYMBOLS = NSE_STOCKS_28;

const MODEL_NAMES: Record<string, string> = {
  lstm: 'Stacked LSTM',
  gru: 'Gated Recurrent (GRU)',
  cnn: '1D Temporal CNN',
  cnn1d: '1D Temporal CNN',
  naive_baseline: 'Naive Baseline (t = t-1)',
};

const MODEL_COLORS: Record<string, string> = {
  lstm: 'var(--color-forecast)',
  gru: 'var(--color-rise)',
  cnn: '#D97706',
  naive_baseline: 'var(--color-ink-subtle)',
};

export const ModelComparisonPage: React.FC = () => {
  const { selectedStock, setSelectedStock, setStockName } = useStock();
  const [data, setData] = useState<ModelComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Line visibility toggles
  const [showActual, setShowActual] = useState(true);
  const [showLSTM, setShowLSTM] = useState(true);
  const [showGRU, setShowGRU] = useState(true);
  const [showCNN, setShowCNN] = useState(true);
  const [showNaive, setShowNaive] = useState(false);

  const fetchComparison = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getModelComparison(selectedStock);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load comparison:', err);
      setError(err.message || 'Predictions are not available for this stock yet');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [selectedStock]);

  const modelsList = ['lstm', 'gru', 'cnn', 'naive_baseline'];

  // Check if any deep learning model beats the naive baseline
  const dlModels = ['lstm', 'gru', 'cnn'];
  const baselineMae = data?.metrics?.naive_baseline?.mae ?? Infinity;
  const baselineRmse = data?.metrics?.naive_baseline?.rmse ?? Infinity;
  const baselineMape = data?.metrics?.naive_baseline?.mape ?? Infinity;

  const anyBeatsMae = dlModels.some((m) => (data?.metrics?.[m]?.mae ?? Infinity) < baselineMae);
  const anyBeatsRmse = dlModels.some((m) => (data?.metrics?.[m]?.rmse ?? Infinity) < baselineRmse);
  const anyBeatsMape = dlModels.some((m) => (data?.metrics?.[m]?.mape ?? Infinity) < baselineMape);
  const noModelBeatsBaseline = !anyBeatsMae && !anyBeatsRmse && !anyBeatsMape;

  // Prepare data for the 4 individual bar charts
  const maeChartData = modelsList
    .map((k) => ({
      name: k === 'naive_baseline' ? 'Naive' : k.toUpperCase(),
      modelKey: k,
      value: data?.metrics?.[k]?.mae ?? 0,
      fill: MODEL_COLORS[k] || '#5B6B79',
    }))
    .filter((d) => d.value > 0);

  const rmseChartData = modelsList
    .map((k) => ({
      name: k === 'naive_baseline' ? 'Naive' : k.toUpperCase(),
      modelKey: k,
      value: data?.metrics?.[k]?.rmse ?? 0,
      fill: MODEL_COLORS[k] || '#5B6B79',
    }))
    .filter((d) => d.value > 0);

  const mapeChartData = modelsList
    .map((k) => ({
      name: k === 'naive_baseline' ? 'Naive' : k.toUpperCase(),
      modelKey: k,
      value: data?.metrics?.[k]?.mape ?? 0,
      fill: MODEL_COLORS[k] || '#5B6B79',
    }))
    .filter((d) => d.value > 0);

  const dirChartData = modelsList
    .map((k) => ({
      name: k === 'naive_baseline' ? 'Naive' : k.toUpperCase(),
      modelKey: k,
      value: data?.metrics?.[k]?.directional_accuracy ?? 0,
      fill: MODEL_COLORS[k] || '#5B6B79',
    }))
    .filter((d) => d.value > 0);

  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border p-2.5 rounded-sm shadow-sm text-xs space-y-1 text-ink tabular-nums">
          <div className="text-[11px] text-ink-muted pb-1 border-b border-border">
            Date: {label}
          </div>
          {payload.map((item: any) => (
            <div key={item.dataKey} className="flex justify-between space-x-3">
              <span className="text-ink-muted">{item.name}:</span>
              <span className="font-semibold text-ink">
                ₹{Number(item.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Stock Switcher */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-2xl md:text-3xl font-medium text-ink tracking-tight">
              Model performance benchmark
            </h1>
            <span className="text-xs text-ink-muted">
              ({selectedStock.replace('.NS', '')})
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Out-of-sample chronological test split (15%) • MinMaxScaler fit on training set only
          </p>
        </div>

        {/* Stock Selector Dropdown */}
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
            onClick={fetchComparison}
            title="Refresh evaluation"
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
          </div>
        </div>
      )}

      {/* Note If No Model Beats Baseline */}
      {noModelBeatsBaseline && data && (
        <div className="p-3.5 rounded-sm bg-surface border border-border text-xs text-ink-muted leading-relaxed">
          <span className="font-medium text-ink">Academic observation: </span>
          For <strong>{selectedStock.replace('.NS', '')}</strong>, the Naive Baseline (&ldquo;tomorrow&apos;s close = today&apos;s close&rdquo;) achieves the lowest one-step point error (MAE ₹{baselineMae.toFixed(2)}). Liquid Indian equities exhibit small daily percentage variance (&lt;1%), making static persistence a mathematically strong single-step benchmark. Neural networks provide non-linear sequence modeling and multi-step rollout trajectories beyond static autocorrelation.
        </div>
      )}

      {/* Best Model KPI Bar */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-border pb-4 text-xs tabular-nums">
          <div>
            <div className="text-[11px] text-ink-subtle">Lowest MAE</div>
            <div className="font-serif text-xl font-medium text-ink mt-0.5 capitalize">
              {MODEL_NAMES[data.best_models.mae] || data.best_models.mae}
            </div>
            <div className="text-xs text-rise font-medium mt-0.5">
              ₹{data.metrics[data.best_models.mae]?.mae.toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">Lowest RMSE</div>
            <div className="font-serif text-xl font-medium text-ink mt-0.5 capitalize">
              {MODEL_NAMES[data.best_models.rmse] || data.best_models.rmse}
            </div>
            <div className="text-xs text-rise font-medium mt-0.5">
              ₹{data.metrics[data.best_models.rmse]?.rmse.toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">Lowest MAPE</div>
            <div className="font-serif text-xl font-medium text-ink mt-0.5 capitalize">
              {MODEL_NAMES[data.best_models.mape] || data.best_models.mape}
            </div>
            <div className="text-xs text-rise font-medium mt-0.5">
              {data.metrics[data.best_models.mape]?.mape.toFixed(2)}%
            </div>
          </div>

          <div>
            <div className="text-[11px] text-ink-subtle">Directional accuracy</div>
            <div className="font-serif text-xl font-medium text-ink mt-0.5 capitalize">
              {MODEL_NAMES[data.best_models.directional_accuracy] || data.best_models.directional_accuracy}
            </div>
            <div className="text-xs text-rise font-medium mt-0.5">
              {data.metrics[data.best_models.directional_accuracy]?.directional_accuracy.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* 1. Metrics Comparison Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-border">
          <span className="font-serif text-base text-ink font-medium">
            Test evaluation matrix
          </span>
          <span className="text-[11px] text-ink-subtle">
            Winning model highlighted per column
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border text-[11px] text-ink-subtle">
                <th className="py-2 pr-3 font-medium">Architecture</th>
                <th className="py-2 px-3 font-medium">MAE (₹) ↓</th>
                <th className="py-2 px-3 font-medium">RMSE (₹) ↓</th>
                <th className="py-2 px-3 font-medium">MAPE (%) ↓</th>
                <th className="py-2 px-3 font-medium">Directional acc. (%) ↑</th>
                <th className="py-2 pl-3 font-medium text-right">Training time (s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modelsList.map((mKey) => {
                const metric = data?.metrics[mKey];
                if (!metric) return null;

                const isBestMAE = data?.best_models.mae === mKey;
                const isBestRMSE = data?.best_models.rmse === mKey;
                const isBestMAPE = data?.best_models.mape === mKey;
                const isBestDir = data?.best_models.directional_accuracy === mKey;
                const isBaseline = mKey === 'naive_baseline';

                return (
                  <tr
                    key={mKey}
                    className={`hover:bg-surface-subtle transition-colors tabular-nums ${
                      isBaseline ? 'text-ink-muted' : 'text-ink'
                    }`}
                  >
                    <td className="py-2 pr-3 font-medium flex items-center space-x-2">
                      <span
                        className="w-2 h-2 rounded-xs inline-block"
                        style={{ backgroundColor: MODEL_COLORS[mKey] }}
                      />
                      <span>{MODEL_NAMES[mKey] || mKey}</span>
                      {isBaseline && (
                        <span className="text-[10px] text-ink-subtle">
                          (benchmark)
                        </span>
                      )}
                    </td>
                    <td className={`py-2 px-3 ${isBestMAE ? 'font-semibold text-rise' : ''}`}>
                      ₹{metric.mae.toFixed(2)} {isBestMAE ? '• best' : ''}
                    </td>
                    <td className={`py-2 px-3 ${isBestRMSE ? 'font-semibold text-rise' : ''}`}>
                      ₹{metric.rmse.toFixed(2)} {isBestRMSE ? '• best' : ''}
                    </td>
                    <td className={`py-2 px-3 ${isBestMAPE ? 'font-semibold text-rise' : ''}`}>
                      {metric.mape.toFixed(2)}% {isBestMAPE ? '• best' : ''}
                    </td>
                    <td className={`py-2 px-3 ${isBestDir ? 'font-semibold text-rise' : ''}`}>
                      {metric.directional_accuracy.toFixed(1)}% {isBestDir ? '• best' : ''}
                    </td>
                    <td className="py-2 pl-3 text-right text-ink-muted">
                      {metric.training_time_seconds && metric.training_time_seconds > 0
                        ? `${metric.training_time_seconds.toFixed(1)}s`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Test Split Overlay Line Chart */}
      {data?.test_chart_data && data.test_chart_data.length > 0 && (
        <div className="border-t border-border pt-6 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="font-serif text-base text-ink font-medium">
                Test split overlay: actual vs predicted prices
              </span>
              <p className="text-xs text-ink-muted mt-0.5">
                Out-of-sample test trajectory comparison across 112 trading sessions
              </p>
            </div>

            {/* Series Toggles */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setShowActual(!showActual)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${
                  showActual
                    ? 'bg-surface-subtle text-ink border-border font-medium'
                    : 'text-ink-subtle border-transparent'
                }`}
              >
                {showActual ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Actual</span>
              </button>
              <button
                onClick={() => setShowLSTM(!showLSTM)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${
                  showLSTM
                    ? 'bg-surface-subtle text-forecast border-border font-medium'
                    : 'text-ink-subtle border-transparent'
                }`}
              >
                {showLSTM ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>LSTM</span>
              </button>
              <button
                onClick={() => setShowGRU(!showGRU)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${
                  showGRU
                    ? 'bg-surface-subtle text-rise border-border font-medium'
                    : 'text-ink-subtle border-transparent'
                }`}
              >
                {showGRU ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>GRU</span>
              </button>
              <button
                onClick={() => setShowCNN(!showCNN)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${
                  showCNN
                    ? 'bg-surface-subtle text-amber-600 dark:text-amber-400 border-border font-medium'
                    : 'text-ink-subtle border-transparent'
                }`}
              >
                {showCNN ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>1D CNN</span>
              </button>
              <button
                onClick={() => setShowNaive(!showNaive)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${
                  showNaive
                    ? 'bg-surface-subtle text-ink-muted border-border font-medium'
                    : 'text-ink-subtle border-transparent'
                }`}
              >
                {showNaive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Baseline</span>
              </button>
            </div>
          </div>

          <div className="h-80 w-full bg-surface border border-border rounded-md p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.test_chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" strokeOpacity={0.7} vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-ink-subtle)" fontSize={11} tickLine={false} tickMargin={8} />
                <YAxis
                  stroke="var(--color-ink-subtle)"
                  fontSize={11}
                  tickLine={false}
                  orientation="right"
                  tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomLineTooltip />} />

                {showActual && (
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Close"
                    stroke="var(--color-ink)"
                    strokeWidth={1.75}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {showLSTM && (
                  <Line
                    type="monotone"
                    dataKey="lstm"
                    name="Stacked LSTM"
                    stroke="var(--color-forecast)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {showGRU && (
                  <Line
                    type="monotone"
                    dataKey="gru"
                    name="Gated Recurrent (GRU)"
                    stroke="var(--color-rise)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {showCNN && (
                  <Line
                    type="monotone"
                    dataKey="cnn"
                    name="1D Temporal CNN"
                    stroke="#D97706"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {showNaive && (
                  <Line
                    type="monotone"
                    dataKey="naive"
                    name="Naive Baseline"
                    stroke="var(--color-ink-subtle)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Metric Bar Charts Grid */}
      <div className="border-t border-border pt-6 space-y-3">
        <div className="font-serif text-base text-ink font-medium">
          Comparative metric distributions
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MAE */}
          <div className="bg-surface border border-border rounded-md p-4 space-y-2">
            <div className="flex justify-between text-xs text-ink-muted">
              <span>MAE (₹)</span>
              <span className="text-[10px] text-ink-subtle">Lower is better</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maeChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" strokeOpacity={0.7} vertical={false} />
                  <XAxis dataKey="name" fontSize={11} stroke="var(--color-ink-subtle)" tickLine={false} />
                  <YAxis fontSize={11} stroke="var(--color-ink-subtle)" tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'MAE']}
                    contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', fontSize: 11 }}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {maeChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RMSE */}
          <div className="bg-surface border border-border rounded-md p-4 space-y-2">
            <div className="flex justify-between text-xs text-ink-muted">
              <span>RMSE (₹)</span>
              <span className="text-[10px] text-ink-subtle">Lower is better</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rmseChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" strokeOpacity={0.7} vertical={false} />
                  <XAxis dataKey="name" fontSize={11} stroke="var(--color-ink-subtle)" tickLine={false} />
                  <YAxis fontSize={11} stroke="var(--color-ink-subtle)" tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'RMSE']}
                    contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', fontSize: 11 }}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {rmseChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MAPE */}
          <div className="bg-surface border border-border rounded-md p-4 space-y-2">
            <div className="flex justify-between text-xs text-ink-muted">
              <span>MAPE (%)</span>
              <span className="text-[10px] text-ink-subtle">Lower is better</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mapeChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" strokeOpacity={0.7} vertical={false} />
                  <XAxis dataKey="name" fontSize={11} stroke="var(--color-ink-subtle)" tickLine={false} />
                  <YAxis fontSize={11} stroke="var(--color-ink-subtle)" tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toFixed(2)}%`, 'MAPE']}
                    contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', fontSize: 11 }}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {mapeChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Directional Accuracy */}
          <div className="bg-surface border border-border rounded-md p-4 space-y-2">
            <div className="flex justify-between text-xs text-ink-muted">
              <span>Directional accuracy (%)</span>
              <span className="text-[10px] text-ink-subtle">Higher is better</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dirChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" strokeOpacity={0.7} vertical={false} />
                  <XAxis dataKey="name" fontSize={11} stroke="var(--color-ink-subtle)" tickLine={false} />
                  <YAxis domain={[0, 100]} fontSize={11} stroke="var(--color-ink-subtle)" tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toFixed(2)}%`, 'Directional Accuracy']}
                    contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', fontSize: 11 }}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {dirChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Quiet Single Line Disclaimer */}
      <div className="pt-4 border-t border-border text-xs text-ink-subtle">
        {data?.disclaimer || 'Experimental forecasts for educational use, not investment advice.'}
      </div>
    </div>
  );
};
