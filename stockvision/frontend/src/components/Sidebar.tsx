import React, { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  BrainCircuit,
  BarChart2,
  Activity,
  Bookmark,
  Clock,
  User as UserIcon,
  ShieldAlert,
  LogOut,
  Search,
  X,
  Sparkles,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NSE_STOCKS_28 } from '../constants/stocks';

// Clean sector abbreviations for compact, attractive stock pills
const SECTOR_SHORT: Record<string, string> = {
  'Energy / Conglomerate': 'Energy',
  'Information Technology': 'Tech',
  'Banking & Financials': 'Banking',
  'Telecommunications': 'Telecom',
  'Public Sector Banking': 'Banking',
  'Consumer Goods / FMCG': 'FMCG',
  'FMCG': 'FMCG',
  'Construction & Engineering': 'Engg',
  'Financial Services / NBFC': 'Finance',
  'Automobile': 'Auto',
  'Automobile / Agriculture': 'Auto',
  'Automobile / 2-Wheelers': 'Auto',
  'Healthcare / Pharma': 'Pharma',
  'Consumer Discretionary': 'Retail',
  'Consumer Goods / Paints': 'Paints',
  'Utilities / Power Generation': 'Power',
  'Utilities / Transmission': 'Power',
  'Energy / Oil & Gas': 'Oil',
  'Metals & Mining': 'Metals',
  'Commodities & Infrastructure': 'Infra',
  'Energy / Mining': 'Mining',
  'Cement & Building Materials': 'Cement',
};

export const Sidebar: React.FC = () => {
  const { selectedStock, setSelectedStock, setStockName } = useStock();
  const { user, signOut, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [stockFilter, setStockFilter] = useState('');

  const mainNavItems = [
    { to: '/', label: 'Historical analysis', icon: TrendingUp },
    { to: '/predict', label: 'Price forecast', icon: BrainCircuit },
    { to: '/compare', label: 'Model benchmark', icon: BarChart2 },
    { to: '/volatility', label: 'Volatility analysis', icon: Activity },
  ];

  const userNavItems = [
    { to: '/watchlist', label: 'Watchlist', icon: Bookmark },
    { to: '/history', label: 'Prediction history', icon: Clock },
    { to: '/profile', label: 'Profile', icon: UserIcon },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin dashboard', icon: ShieldAlert, badge: 'Staff' }] : []),
  ];

  const filteredStocks = useMemo(() => {
    if (!stockFilter.trim()) return NSE_STOCKS_28;
    const q = stockFilter.toLowerCase().trim();
    return NSE_STOCKS_28.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
    );
  }, [stockFilter]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Resilient user email resolution that never defaults to empty or hides on navigation
  const savedUserJson =
    typeof window !== 'undefined'
      ? localStorage.getItem('sv_user') || localStorage.getItem('sv_demo_user')
      : null;
  let savedEmail = '';
  try {
    if (savedUserJson) {
      savedEmail = JSON.parse(savedUserJson)?.email || '';
    }
  } catch {}

  const displayEmail = user?.email || savedEmail || 'student@stockvision.edu';
  const userInitial = (displayEmail || 'U').charAt(0).toUpperCase();

  return (
    <aside className="w-[272px] h-screen sticky top-0 bg-surface border-r border-border/80 text-ink flex flex-col justify-between shrink-0 select-none shadow-xs transition-colors z-20">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Brand Masthead: Editorial "Market research notebook" style */}
        <div className="px-5 py-4 border-b border-border/70 shrink-0">
          <div className="flex items-baseline justify-between">
            <NavLink
              to="/"
              className="group focus:outline-none"
              title="StockVision Home"
            >
              <h1 className="font-serif font-bold text-[22px] tracking-tight text-ink leading-none group-hover:text-forecast transition-colors">
                StockVision
              </h1>
            </NavLink>
            <span className="text-[9px] font-mono font-medium text-ink-subtle px-1.5 py-0.5 rounded bg-surface-subtle border border-border/60">
              NSE 28
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-2 text-[11px] text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-rise shrink-0" />
            <span className="tracking-tight">Market research notebook</span>
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Analytics Section */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
              Analytics
            </div>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-forecast/10 text-forecast font-semibold shadow-xs'
                        : 'text-ink-muted hover:text-ink hover:bg-surface-subtle/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-forecast rounded-r-full" />
                      )}

                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                            isActive ? 'text-forecast' : 'text-ink-subtle group-hover:text-ink'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Workspace Section */}
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
              Workspace
            </div>
            {userNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-forecast/10 text-forecast font-semibold shadow-xs'
                        : 'text-ink-muted hover:text-ink hover:bg-surface-subtle/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-forecast rounded-r-full" />
                      )}

                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                            isActive ? 'text-forecast' : 'text-ink-subtle group-hover:text-ink'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-fall/15 text-fall">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Equities Section with real-time search & sector tags */}
          <div className="space-y-2 pt-1 border-t border-border/50">
            <div className="px-2.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
                Equities
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-subtle text-ink-muted font-mono border border-border/40">
                {NSE_STOCKS_28.length} ready
              </span>
            </div>

            {/* Quick Filter Box */}
            <div className="relative px-1">
              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
              <input
                type="text"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                placeholder="Filter 28 stocks..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface-subtle/60 border border-border/60 rounded-lg text-ink placeholder:text-ink-subtle/70 focus:outline-none focus:border-forecast focus:bg-surface transition-all"
              />
              {stockFilter && (
                <button
                  onClick={() => setStockFilter('')}
                  className="absolute right-3 top-2 text-ink-subtle hover:text-ink p-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Scrollable Stocks List */}
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {filteredStocks.length === 0 ? (
                <div className="p-3 text-center text-xs text-ink-muted">
                  No stocks match &quot;{stockFilter}&quot;
                </div>
              ) : (
                filteredStocks.map((stock) => {
                  const isSelected = selectedStock === stock.symbol;
                  const shortSymbol = stock.symbol.replace('.NS', '');
                  const sectorTag = SECTOR_SHORT[stock.sector] || stock.sector.split(' ')[0];

                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => {
                        setSelectedStock(stock.symbol);
                        setStockName(stock.name);
                      }}
                      className={`w-full group px-2.5 py-1.5 text-left rounded-lg text-xs flex items-center justify-between transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-forecast/10 text-forecast font-semibold border border-forecast/30 shadow-xs'
                          : 'text-ink-muted hover:text-ink hover:bg-surface-subtle/70 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 pr-1 flex items-center space-x-2">
                        {isSelected ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-forecast shrink-0 shadow-xs" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-border shrink-0 group-hover:bg-ink-subtle transition-colors" />
                        )}
                        <div className="truncate">
                          <div
                            className={`truncate leading-tight ${
                              isSelected ? 'text-forecast font-bold' : 'text-ink font-semibold'
                            }`}
                          >
                            {shortSymbol}
                          </div>
                          <div className="text-[10px] text-ink-subtle truncate max-w-[130px] leading-tight">
                            {stock.name.split(' Ltd.')[0].split(' Limited')[0]}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-forecast/20 text-forecast'
                            : 'bg-surface-subtle text-ink-subtle group-hover:text-ink-muted'
                        }`}
                      >
                        {sectorTag}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Footer / User Profile Card & Utilities - Always Visible at All Times */}
      <div className="border-t border-border/80 p-3 space-y-2.5 shrink-0 bg-surface">
        <div className="p-2 rounded-xl bg-surface-subtle/80 border border-border/60 flex items-center justify-between shadow-xs">
          <NavLink
            to="/profile"
            className="flex items-center space-x-2.5 min-w-0 flex-1 group"
            title="Open profile details"
          >
            <div className="h-8 w-8 rounded-full bg-forecast/10 border border-forecast/25 flex items-center justify-center text-xs font-bold text-forecast shrink-0">
              {userInitial}
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-semibold text-ink truncate group-hover:text-forecast transition-colors">
                {displayEmail}
              </div>
              <div className="text-[10px] text-ink-subtle flex items-center space-x-1">
                <span>{isAdmin ? 'Staff administrator' : 'Student account'}</span>
                <ChevronRight className="h-2.5 w-2.5 opacity-60" />
              </div>
            </div>
          </NavLink>

          <div className="flex items-center space-x-0.5 shrink-0 ml-1">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-forecast" />}
            </button>

            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg text-ink-subtle hover:text-fall hover:bg-fall/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quiet Educational Notice */}
        <div className="text-[10px] text-ink-subtle px-1 leading-tight text-center">
          Educational platform • Not financial advice
        </div>
      </div>
    </aside>
  );
};
