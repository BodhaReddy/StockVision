import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, User as UserIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { useAuth } from '../context/AuthContext';
import { StockSearch } from './StockSearch';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { selectedStock, stockName } = useStock();
  const { user } = useAuth();

  return (
    <header className="h-14 px-6 bg-surface/90 backdrop-blur-md border-b border-border/80 flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center space-x-4 flex-1">
        <StockSearch />

        {/* Selected stock quick pill indicator */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-subtle/80 border border-border/60 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rise opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rise"></span>
          </span>
          <span className="font-bold text-ink">{selectedStock.replace('.NS', '')}</span>
          <span className="text-ink-subtle">•</span>
          <span className="text-ink-muted truncate max-w-xs">{stockName}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2.5">
        {/* User Pill */}
        {user ? (
          <Link
            to="/profile"
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-subtle rounded-xl transition-all border border-border/60 shadow-xs"
          >
            <UserIcon className="h-3.5 w-3.5 text-forecast" />
            <span className="truncate max-w-[140px]">{user.email}</span>
          </Link>
        ) : null}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-subtle border border-border/60 transition-all cursor-pointer shadow-xs"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-forecast" />}
        </button>
      </div>
    </header>
  );
};
