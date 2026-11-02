import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Check, X } from 'lucide-react';
import { api } from '../services/api';
import { StockSearchResult } from '../types';
import { useStock } from '../context/StockContext';
import { NSE_STOCKS_28, PRETRAINED_SYMBOLS_LIST } from '../constants/stocks';

export const StockSearch: React.FC<{ onSelect?: (symbol: string) => void }> = ({ onSelect }) => {
  const { selectedStock, setSelectedStock, setStockName } = useStock();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.searchStocks(query);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (stock: StockSearchResult) => {
    setSelectedStock(stock.symbol);
    setStockName(stock.name);
    setIsOpen(false);
    setQuery('');
    if (onSelect) onSelect(stock.symbol);
  };

  return (
    <div className="relative w-full max-w-sm" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search Indian NSE equities..."
          className="w-full pl-8 pr-8 py-1.5 rounded-xl text-xs bg-surface-subtle/70 border border-border/70 text-ink placeholder:text-ink-subtle/70 focus:outline-none focus:border-forecast focus:bg-surface focus:ring-2 focus:ring-forecast/10 transition-all shadow-xs"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 h-3.5 w-3.5 text-forecast animate-spin" />
        ) : query ? (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 text-ink-subtle hover:text-ink p-0.5 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-2xl border border-border/80 py-1.5 z-50 max-h-80 overflow-y-auto shadow-xl shadow-black/5 dark:shadow-black/20">
          <div className="px-3.5 py-1 text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
            {query.trim() ? 'Search results' : 'Suggested equities'}
          </div>

          {(query.trim() ? results : NSE_STOCKS_28).map((stock) => {
            const isPretrained = PRETRAINED_SYMBOLS_LIST.includes(stock.symbol);
            const isCurrent = stock.symbol === selectedStock;

            return (
              <button
                key={stock.symbol}
                onClick={() => handleSelect(stock as StockSearchResult)}
                className={`w-full px-3.5 py-2 flex items-center justify-between text-left hover:bg-surface-subtle transition-colors text-xs cursor-pointer ${
                  isCurrent ? 'bg-forecast/10 font-semibold text-forecast' : ''
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className={`font-bold ${isCurrent ? 'text-forecast' : 'text-ink'}`}>
                      {stock.symbol.replace('.NS', '')}
                    </span>
                    {isPretrained && (
                      <span className="text-[10px] text-rise font-medium bg-rise/10 px-1.5 py-0.2 rounded-md">
                        Pre-trained
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-muted truncate mt-0.5">
                    {stock.name} {stock.sector ? `• ${stock.sector.split('/')[0].trim()}` : ''}
                  </span>
                </div>
                {isCurrent && <Check className="h-4 w-4 text-forecast shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
