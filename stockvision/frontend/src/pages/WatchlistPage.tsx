import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Trash2,
  TrendingUp,
  TrendingDown,
  LineChart,
  BrainCircuit,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { WatchlistItem } from '../types';
import { useStock } from '../context/StockContext';

export const WatchlistPage: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSymbol, setDeletingSymbol] = useState<string | null>(null);

  const { setSelectedStock, setStockName } = useStock();
  const navigate = useNavigate();

  const fetchWatchlist = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getWatchlist();
      setWatchlist(data);
    } catch (err: any) {
      console.error('Failed to load watchlist:', err);
      setError(err.message || 'Could not load your saved stocks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleRemove = async (symbol: string) => {
    setDeletingSymbol(symbol);
    try {
      await api.removeFromWatchlist(symbol);
      setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
    } catch (err: any) {
      console.error('Failed to delete from watchlist:', err);
      alert(err.message || 'Failed to remove from watchlist');
    } finally {
      setDeletingSymbol(null);
    }
  };

  const handleAnalyze = (item: WatchlistItem) => {
    setSelectedStock(item.symbol);
    setStockName(item.name);
    navigate('/');
  };

  const handlePredict = (item: WatchlistItem) => {
    setSelectedStock(item.symbol);
    setStockName(item.name);
    navigate('/predict');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-divider pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink tracking-tight">
            Personal watchlist
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Tracked Indian NSE equities with direct analysis and deep learning rollout shortcuts.
          </p>
        </div>
        <div className="text-xs text-ink-muted tabular-nums">
          {watchlist.length} {watchlist.length === 1 ? 'equity' : 'equities'} bookmarked
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
          <span className="text-xs text-ink-muted">Loading your bookmarked equities...</span>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="bg-surface border border-border rounded-notebook p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-ink-muted">
            <Star className="h-5 w-5" />
          </div>
          <div className="max-w-md">
            <h3 className="text-sm font-semibold text-ink">
              Your watchlist is currently empty
            </h3>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Click the star button on any stock overview or search for popular equities like RELIANCE, TCS, or INFY to bookmark them.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-notebook bg-surface border border-border hover:bg-surface-subtle text-ink text-xs font-medium transition-colors"
          >
            <span>Explore NSE stocks</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-notebook overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-ink">
              <thead className="bg-surface-subtle border-b border-divider text-ink-muted font-medium">
                <tr>
                  <th className="px-4 py-2.5">Equity / Company</th>
                  <th className="px-4 py-2.5 text-right">Latest close</th>
                  <th className="px-4 py-2.5 text-right">Daily change</th>
                  <th className="px-4 py-2.5">Saved date</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-sans">
                {watchlist.map((item) => {
                  const isPos = item.change >= 0;
                  const isDeleting = deletingSymbol === item.symbol;

                  return (
                    <tr
                      key={item.symbol}
                      className="hover:bg-surface-subtle/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink text-sm">
                          {item.symbol}
                        </div>
                        <div className="text-[11px] text-ink-muted truncate max-w-xs">
                          {item.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink tabular-nums text-sm">
                        ₹{item.current_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span
                          className={`inline-flex items-center font-medium ${
                            isPos ? 'text-rise' : 'text-fall'
                          }`}
                        >
                          {isPos ? (
                            <TrendingUp className="h-3 w-3 mr-1 inline" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1 inline" />
                          )}
                          {isPos ? '+' : ''}
                          {item.change.toFixed(2)} ({isPos ? '+' : ''}
                          {item.percent_change.toFixed(2)}% {isPos ? 'rise' : 'fall'})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted tabular-nums">
                        {item.created_at ? item.created_at.slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleAnalyze(item)}
                            title="Open historical technical analysis"
                            className="px-2.5 py-1 rounded-notebook bg-surface-subtle hover:bg-surface text-ink text-xs font-medium border border-border transition-colors flex items-center space-x-1"
                          >
                            <LineChart className="h-3 w-3 text-ink-muted" />
                            <span>Analyze</span>
                          </button>

                          <button
                            onClick={() => handlePredict(item)}
                            title="Open deep learning prediction"
                            className="px-2.5 py-1 rounded-notebook bg-forecast/10 hover:bg-forecast/20 text-forecast text-xs font-medium border border-forecast/20 transition-colors flex items-center space-x-1"
                          >
                            <BrainCircuit className="h-3 w-3" />
                            <span>Forecast</span>
                          </button>

                          <button
                            onClick={() => handleRemove(item.symbol)}
                            disabled={isDeleting}
                            title="Remove from watchlist"
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quiet educational notice */}
      <div className="pt-2 border-t border-divider text-[11px] text-ink-muted">
        Academic note: Bookmarked tickers are saved per authenticated user session and protected via PostgreSQL Row Level Security (RLS).
      </div>
    </div>
  );
};
