import React, { useState, useEffect } from 'react';
import {
  Mail,
  Shield,
  Star,
  BrainCircuit,
  LogOut,
  Loader2,
  AlertCircle,
  Database,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserProfileResponse } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, signOut, isDemoMode } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getUserProfile();
        setProfile(data);
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        setError(err.message || 'Could not load profile statistics.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const email = user?.email || profile?.email || 'user@stockvision.edu';
  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-divider pb-4">
        <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink tracking-tight">
          Account details
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          User identity, database quotas, and quantitative activity records.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3.5 rounded-notebook bg-fall/10 border border-fall/20 flex items-start space-x-2.5 text-xs text-fall">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Profile Card */}
      <div className="bg-surface border border-border rounded-notebook p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-divider pb-6">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-notebook bg-surface-subtle border border-border flex items-center justify-center font-serif text-xl text-ink font-medium">
              {initial}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-base font-semibold text-ink">
                  {email}
                </h2>
                <span className="inline-flex items-center text-[11px] text-rise font-medium">
                  <CheckCircle className="h-3 w-3 mr-1 inline" />
                  Active session
                </span>
                {profile?.is_admin && (
                  <span className="inline-flex items-center text-[11px] text-forecast font-medium">
                    <ShieldCheck className="h-3 w-3 mr-1 inline" />
                    Administrator
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-ink-muted mt-1">
                <Mail className="h-3.5 w-3.5" />
                <span>{email}</span>
                <span>•</span>
                <span className="font-mono text-[11px]">
                  ID: {user?.id ? user.id.slice(0, 18) + '...' : '00000000-...'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="px-3.5 py-1.5 rounded-notebook bg-surface border border-border hover:bg-surface-subtle text-ink-muted hover:text-ink text-xs font-medium transition-colors flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Activity & Storage Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Saved Stocks Counter */}
          <div className="p-4 rounded-notebook bg-surface-subtle border border-border space-y-1">
            <div className="text-xs text-ink-muted flex items-center">
              <Star className="h-3.5 w-3.5 mr-1.5 text-ink-muted" />
              <span>Saved watchlist equities</span>
            </div>
            <div className="font-serif text-3xl font-normal text-ink tabular-nums">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-forecast" /> : profile?.saved_stocks_count ?? 0}
            </div>
            <div className="text-[11px] text-ink-muted">
              Equities stored in PostgreSQL
            </div>
          </div>

          {/* Predictions Counter */}
          <div className="p-4 rounded-notebook bg-surface-subtle border border-border space-y-1">
            <div className="text-xs text-ink-muted flex items-center">
              <BrainCircuit className="h-3.5 w-3.5 mr-1.5 text-ink-muted" />
              <span>Forecasts generated</span>
            </div>
            <div className="font-serif text-3xl font-normal text-ink tabular-nums">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-forecast" /> : profile?.predictions_count ?? 0}
            </div>
            <div className="text-[11px] text-ink-muted">
              Deep learning rollouts recorded
            </div>
          </div>
        </div>

        {/* Security & System Info */}
        <div className="p-3.5 rounded-notebook bg-surface-subtle border border-divider space-y-2 text-xs text-ink-muted">
          <div className="flex items-center justify-between">
            <span className="flex items-center text-ink">
              <Database className="h-3.5 w-3.5 mr-1.5 text-forecast" />
              Database and auth backend
            </span>
            <span className="font-mono text-[11px] text-ink font-medium">
              {isDemoMode ? 'Local educational fallback' : 'Supabase PostgreSQL + RLS'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center text-ink">
              <Shield className="h-3.5 w-3.5 mr-1.5 text-rise" />
              Row level security policy
            </span>
            <span className="font-mono text-[11px] text-ink font-medium">auth.uid() = user_id</span>
          </div>
        </div>
      </div>
    </div>
  );
};
