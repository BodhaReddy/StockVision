import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const NavigationHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, isAdmin } = useAuth();

  const navItems = [
    { to: '/', label: 'Price history' },
    { to: '/predict', label: 'Predict price' },
    { to: '/compare', label: 'Compare models' },
    { to: '/volatility', label: 'Ups and downs' },
    { to: '/watchlist', label: 'Saved stocks' },
    { to: '/history', label: 'Past predictions' },
    { to: '/profile', label: 'My account' },
    ...(isAdmin ? [{ to: '/admin', label: 'Staff overview' }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="w-full pt-8 pb-4 px-4 sm:px-6 select-none">
      <div className="max-w-[1000px] mx-auto flex flex-col items-center">
        {/* Top bar with subtle controls and centered Wordmark */}
        <div className="w-full relative flex items-center justify-center mb-6">
          <Link
            to="/"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-ink hover:opacity-90 transition-opacity"
          >
            StockVision
          </Link>

          {/* Quick utility controls in top right */}
          <div className="absolute right-0 flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-full border border-border text-ink-muted hover:text-ink hover:bg-panel transition-all cursor-pointer btn-lift"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {user && (
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-ink-muted hover:text-fall hover:border-fall/30 hover:bg-panel transition-all cursor-pointer btn-lift"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            )}
          </div>
        </div>

        {/* Pill-shaped Navigation Row */}
        <nav
          className="w-full flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar py-1 px-1 gap-1 sm:gap-1.5"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors btn-lift ${
                  isActive
                    ? 'text-accent-text'
                    : 'text-ink-muted hover:text-ink hover:bg-panel/60'
                }`}
              >
                {/* Smooth sliding pill background using layoutId */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                    className="absolute inset-0 bg-accent rounded-full -z-10 shadow-xs"
                  />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

