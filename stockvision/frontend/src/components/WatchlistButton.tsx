import React, { useState, useEffect } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export const WatchlistButton: React.FC<{ symbol: string; showLabel?: boolean }> = ({
  symbol,
  showLabel = true,
}) => {
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    api
      .getWatchlist()
      .then((list) => {
        if (isMounted) {
          const found = list.some((item) => item.symbol === symbol);
          setIsSaved(found);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    try {
      if (isSaved) {
        await api.removeFromWatchlist(symbol);
        setIsSaved(false);
      } else {
        await api.addToWatchlist(symbol);
        setIsSaved(true);
      }
    } catch (err: any) {
      console.error('Watchlist toggle failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      title={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm text-xs border transition-colors cursor-pointer ${
        isSaved
          ? 'bg-surface-subtle text-ink border-border font-medium'
          : 'bg-surface text-ink-muted border-border hover:text-ink hover:bg-surface-subtle'
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-muted" />
      ) : (
        <Bookmark
          className={`h-3.5 w-3.5 ${
            isSaved ? 'fill-ink text-ink' : 'text-ink-muted'
          }`}
        />
      )}
      {showLabel && (
        <span>{isSaved ? 'In watchlist' : 'Add to watchlist'}</span>
      )}
    </button>
  );
};
