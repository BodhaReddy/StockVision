import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../services/api';
import { PredictionHistoryItem } from '../types';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getHistory();
      setHistory(data);
    } catch (err: any) {
      console.error('Failed to load prediction history:', err);
      setError(err.message || 'Could not load your prediction history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error('Failed to delete history item:', err);
      alert(err.message || 'Failed to delete record');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-divider pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink tracking-tight">
            Prediction history
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Audit log of deep learning rollouts executed across user sessions.
          </p>
        </div>
        <div className="text-xs text-ink-muted tabular-nums">
          {history.length} {history.length === 1 ? 'record' : 'records'} logged
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3.5 rounded-notebook bg-fall/10 border border-fall/20 flex items-start space-x-2.5 text-xs text-fall">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="bg-surface border border-border rounded-notebook p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="h-5 w-5 text-forecast animate-spin" />
          <span className="text-xs text-ink-muted">Loading your prediction audit records...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-surface border border-border rounded-notebook p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-ink-muted">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="max-w-md">
            <h3 className="text-sm font-semibold text-ink">
              No predictions recorded yet
            </h3>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Every multi-step deep learning forecast evaluated on the Predict page is automatically archived here for review.
            </p>
          </div>
          <button
            onClick={() => navigate('/predict')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-notebook bg-surface border border-border hover:bg-surface-subtle text-ink text-xs font-medium transition-colors"
          >
            <span>Run a forecast</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-notebook overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-ink">
              <thead className="bg-surface-subtle border-b border-divider text-ink-muted font-medium">
                <tr>
                  <th className="px-4 py-2.5">Equity</th>
                  <th className="px-4 py-2.5">Architecture</th>
                  <th className="px-4 py-2.5">Horizon</th>
                  <th className="px-4 py-2.5 text-right">Latest close</th>
                  <th className="px-4 py-2.5 text-right">Target forecast</th>
                  <th className="px-4 py-2.5">Expected direction</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-sans">
                {history.map((item) => {
                  const isUp = item.direction === 'UP';
                  const isDown = item.direction === 'DOWN';
                  const isExpanded = expandedId === item.id;
                  const isDeleting = deletingId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-ink">
                          {item.symbol}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-notebook text-[11px] font-medium bg-surface-subtle border border-border text-ink">
                            {item.model}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-muted tabular-nums">
                          +{item.horizon} {item.horizon === 1 ? 'day' : 'days'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                          ₹{item.latest_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div className="font-medium text-ink">
                            ₹{item.final_predicted_price.toFixed(2)}
                          </div>
                          <div
                            className={`text-[10px] ${
                              isUp ? 'text-rise' : isDown ? 'text-fall' : 'text-ink-muted'
                            }`}
                          >
                            {isUp ? '+' : ''}
                            {item.expected_change.toFixed(2)} ({isUp ? '+' : ''}
                            {item.expected_change_pct.toFixed(2)}%)
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center text-xs font-medium ${
                              isUp
                                ? 'text-rise'
                                : isDown
                                ? 'text-fall'
                                : 'text-ink-muted'
                            }`}
                          >
                            {isUp ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : isDown ? (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            ) : (
                              <Minus className="h-3 w-3 mr-1" />
                            )}
                            {isUp ? 'Rise' : isDown ? 'Fall' : 'Neutral'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-muted tabular-nums">
                          {item.created_at ? item.created_at.slice(0, 16).replace('T', ' ') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => toggleExpand(item.id)}
                              title="Toggle step trajectory view"
                              className="px-2 py-1 rounded-notebook text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors text-xs flex items-center space-x-1 border border-transparent hover:border-border"
                            >
                              <span>{isExpanded ? 'Hide' : 'Trajectory'}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>

                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={isDeleting}
                              title="Delete from history"
                              className="p-1 rounded-notebook text-ink-muted hover:text-fall hover:bg-fall/10 transition-colors"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-fall" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable step-by-step rollout drawer */}
                      {isExpanded && item.predicted_prices && (
                        <tr>
                          <td colSpan={8} className="bg-surface-subtle/60 p-4 border-b border-divider">
                            <div className="space-y-2">
                              <div className="text-[11px] font-medium text-ink-muted">
                                Multi-step forecast sequence ({item.symbol} • {item.model})
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {Array.isArray(item.predicted_prices) &&
                                  item.predicted_prices.map((pt: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="p-2.5 rounded-notebook bg-surface border border-border text-xs space-y-0.5"
                                    >
                                      <div className="text-ink-muted text-[10px]">
                                        Step +{pt.step || idx + 1} ({pt.date || 'T+' + (idx + 1)})
                                      </div>
                                      <div className="font-serif text-sm font-medium text-forecast tabular-nums">
                                        ₹{(pt.predicted_close || 0).toFixed(2)}
                                      </div>
                                      {pt.lower_bound && pt.upper_bound && (
                                        <div className="text-[10px] text-ink-muted tabular-nums">
                                          ₹{pt.lower_bound.toFixed(0)} – ₹{pt.upper_bound.toFixed(0)}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quiet educational notice */}
      <div className="pt-2 border-t border-divider text-[11px] text-ink-muted">
        Academic note: Prediction records are isolated to each student session via PostgreSQL Row Level Security policies.
      </div>
    </div>
  );
};
