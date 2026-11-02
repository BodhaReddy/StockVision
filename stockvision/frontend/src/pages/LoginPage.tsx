import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    const { error: authError } = await signIn(email, password);
    setIsSubmitting(false);

    if (authError) {
      setError(authError.message || 'Authentication failed. Please check your credentials.');
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-forecast/20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="font-serif text-3xl font-normal text-ink tracking-tight">
          StockVision
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          Market research notebook & deep learning forecasting suite
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface border border-border p-6 sm:p-8 rounded-notebook space-y-6">
          <div className="border-b border-divider pb-3">
            <h2 className="font-serif text-xl font-normal text-ink">
              Sign in
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Enter your credentials to access your account.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-notebook bg-fall/10 border border-fall/20 text-fall text-xs flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-notebook text-xs text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-forecast transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-notebook text-xs text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-forecast transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-forecast hover:opacity-90 text-white font-medium text-xs rounded-notebook transition-opacity flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-ink-muted pt-2 border-t border-divider">
            Need an account?{' '}
            <Link to="/register" className="text-forecast hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
