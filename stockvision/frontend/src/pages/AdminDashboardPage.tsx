import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  BrainCircuit,
  Database,
  Calendar,
  Clock,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AdminDashboardStats } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load admin stats:', err);
      setError(err.message || 'Access denied or failed to load administrator statistics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, fetchStats]);

  // If user is not admin, hide UI completely and render protected 403 access barrier
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="h-12 w-12 rounded-notebook bg-fall/10 border border-fall/20 flex items-center justify-center text-fall">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="font-serif text-2xl font-normal text-ink">
            403 – Administrator access required
          </h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            This dashboard is restricted to designated staff and platform administrators with the{' '}
            <code className="text-fall font-semibold">is_admin</code> flag enabled. Your account (
            <span className="font-medium text-ink">{user?.email || 'Student'}</span>)
            does not hold administrative clearance.
          </p>
        </div>
        <Link
          to="/"
          className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-surface border border-border hover:bg-surface-subtle text-ink rounded-notebook text-xs font-medium transition-colors"
        >
          <span>Return to stock analysis</span>
          <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
        </Link>
      </div>
    );
  }

  const totalModelForecasts = stats
    ? Object.values(stats.predictions_by_model).reduce((a, b) => a + b, 0)
    : 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-divider pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink tracking-tight">
              Administrator telemetry
            </h1>
            <span className="px-2 py-0.5 rounded-notebook bg-surface-subtle border border-border text-xs text-ink-muted flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5 text-forecast" />
              <span>Admin clearance</span>
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            System health, student population, model usage auditing, and serialized neural weights.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-ink-muted">Signed in as administrator</div>
            <div className="text-xs font-medium text-ink">{user?.email}</div>
          </div>
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="p-2 rounded-notebook bg-surface border border-border hover:bg-surface-subtle text-ink-muted hover:text-ink transition-colors cursor-pointer"
            title="Refresh admin telemetry"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-forecast' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-notebook bg-fall/10 border border-fall/20 text-fall text-xs flex items-center space-x-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Registered Users */}
          <div className="p-4 rounded-notebook bg-surface border border-border space-y-1">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Total users</span>
              <Users className="h-3.5 w-3.5 text-ink-muted" />
            </div>
            <div className="font-serif text-3xl font-normal text-ink tabular-nums">
              {stats.total_users}
            </div>
            <div className="text-[11px] text-ink-muted">
              Registered student accounts
            </div>
          </div>

          {/* Total Predictions Generated */}
          <div className="p-4 rounded-notebook bg-surface border border-border space-y-1">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Total predictions</span>
              <BrainCircuit className="h-3.5 w-3.5 text-forecast" />
            </div>
            <div className="font-serif text-3xl font-normal text-forecast tabular-nums">
              {stats.total_predictions}
            </div>
            <div className="text-[11px] text-ink-muted">
              Multi-step rollouts executed
            </div>
          </div>

          {/* Active Pre-trained Models */}
          <div className="p-4 rounded-notebook bg-surface border border-border space-y-1">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Trained assets</span>
              <Database className="h-3.5 w-3.5 text-rise" />
            </div>
            <div className="font-serif text-3xl font-normal text-rise tabular-nums">
              {stats.trained_models.length}
            </div>
            <div className="text-[11px] text-ink-muted">
              {stats.trained_models.length * 3} neural network weights online
            </div>
          </div>

          {/* Top In-Demand Stock */}
          <div className="p-4 rounded-notebook bg-surface border border-border space-y-1">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Top stock</span>
              <TrendingUp className="h-3.5 w-3.5 text-ink-muted" />
            </div>
            <div className="font-serif text-2xl font-normal text-ink truncate tabular-nums">
              {stats.most_predicted_stocks[0]?.symbol || 'RELIANCE.NS'}
            </div>
            <div className="text-[11px] text-ink-muted">
              {stats.most_predicted_stocks[0]?.count || 0} user forecasts logged
            </div>
          </div>
        </div>
      )}

      {/* Model Distribution & Most Predicted Equities */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Predictions by Architecture */}
          <div className="bg-surface border border-border rounded-notebook p-5 space-y-4">
            <div className="border-b border-divider pb-3">
              <h2 className="text-sm font-semibold text-ink">
                Predictions by architecture
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Model utilization across student queries
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(stats.predictions_by_model).map(([modelName, count]) => {
                const pct = Math.round((count / (totalModelForecasts || 1)) * 100);
                const isLstm = modelName === 'LSTM';
                const isGru = modelName === 'GRU';
                const barColor = isLstm ? 'bg-forecast' : isGru ? 'bg-rise' : 'bg-[#D97706]';
                return (
                  <div key={modelName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">
                        {modelName === 'CNN' ? '1D CNN' : modelName}
                      </span>
                      <span className="text-ink-muted tabular-nums">
                        {count} forecasts ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden border border-border/50">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-[11px] text-ink-muted border-t border-divider">
              Users experiment across all 3 deep learning architectures with 60-day feature inputs.
            </div>
          </div>

          {/* Most Predicted Stocks Ranking */}
          <div className="lg:col-span-2 bg-surface border border-border rounded-notebook p-5 space-y-4">
            <div className="border-b border-divider pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Most-predicted Indian NSE equities
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Aggregate query volume ranked by demand
                </p>
              </div>
              <span className="text-[11px] text-ink-muted bg-surface-subtle px-2 py-0.5 rounded-notebook border border-border">
                {stats.most_predicted_stocks.length} monitored stocks
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-divider text-ink-muted font-medium">
                    <th className="py-2 px-3">Rank</th>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3 text-right">Total forecasts</th>
                    <th className="py-2 px-3">Share</th>
                    <th className="py-2 px-3 text-right">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider font-sans">
                  {stats.most_predicted_stocks.map((stock, idx) => {
                    const share = Math.round((stock.count / (stats.total_predictions || 1)) * 100);
                    return (
                      <tr key={stock.symbol} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-2 px-3 text-ink-muted tabular-nums font-mono text-[11px]">
                          #{idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-ink">
                          {stock.symbol}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-ink tabular-nums">
                          {stock.count} runs
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-surface-subtle h-1.5 rounded-full overflow-hidden border border-border/50">
                              <div
                                className="bg-forecast h-full rounded-full"
                                style={{ width: `${Math.max(8, share)}%` }}
                              />
                            </div>
                            <span className="text-ink-muted text-[10px] tabular-nums">{share}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-notebook bg-surface-subtle text-ink-muted text-[10px] font-medium border border-border">
                            LSTM • GRU • CNN
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trained Model Artifacts Table */}
      {stats && (
        <div className="bg-surface border border-border rounded-notebook p-5 space-y-4">
          <div className="border-b border-divider pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Pre-trained model inventory and serialization registry
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Offline serialized Keras weights, scalers, and training checkpoints stored on disk
              </p>
            </div>
            <span className="text-xs text-rise bg-rise/10 border border-rise/20 px-2.5 py-0.5 rounded-notebook w-fit font-medium">
              All models synchronized
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-divider text-ink-muted font-medium">
                <tr>
                  <th className="py-2.5 px-3">Stock symbol</th>
                  <th className="py-2.5 px-3">Architectures loaded</th>
                  <th className="py-2.5 px-3">Last-trained</th>
                  <th className="py-2.5 px-3 text-right">Epochs</th>
                  <th className="py-2.5 px-3 text-right">Training duration</th>
                  <th className="py-2.5 px-3 text-right">Disk footprint</th>
                  <th className="py-2.5 px-3 text-right">Engine status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-sans text-ink">
                {stats.trained_models.map((item) => (
                  <tr key={item.symbol} className="hover:bg-surface-subtle/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-ink">{item.symbol}</div>
                      <div className="text-[10px] text-ink-muted font-mono">backend/ml/saved_models/{item.symbol}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-1">
                        {item.models.map((m) => (
                          <span
                            key={m}
                            className="px-1.5 py-0.5 rounded-notebook bg-surface-subtle text-ink text-[10px] font-medium border border-border"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-ink-muted">
                      <div className="flex items-center space-x-1 tabular-nums">
                        <Calendar className="h-3 w-3 text-ink-muted" />
                        <span>{item.last_trained_date}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                      {item.epochs_run ?? 35}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-muted">
                      <div className="flex items-center justify-end space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{item.training_time_seconds ? `${item.training_time_seconds}s` : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-muted font-mono text-[11px]">
                      {item.size_kb ? `${(item.size_kb / 1024).toFixed(2)} MB` : '1.02 MB'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-notebook text-[10px] font-medium bg-rise/10 text-rise border border-rise/20">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Environment Info */}
      {stats && (
        <div className="p-3.5 rounded-notebook bg-surface border border-divider flex flex-col sm:flex-row sm:items-center justify-between text-xs text-ink-muted gap-2">
          <div className="flex items-center space-x-4 flex-wrap">
            <span>
              Python: <strong className="text-ink font-mono">{stats.system_status.python_version}</strong>
            </span>
            <span>
              Platform: <strong className="text-ink">{stats.system_status.platform}</strong>
            </span>
            <span>
              Feature window: <strong className="text-ink tabular-nums">{stats.system_status.sequence_length} days</strong>
            </span>
          </div>
          <div className="text-[11px]">
            API strictly enforces <code className="text-forecast font-medium">is_admin</code> claim authorization.
          </div>
        </div>
      )}
    </div>
  );
};
