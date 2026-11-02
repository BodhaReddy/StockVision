import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    const { error: authError, data } = await signUp(email, password);
    setIsSubmitting(false);

    if (authError) {
      setError(authError.message || 'Registration failed. Please check your credentials.');
    } else {
      if (data?.session) {
        navigate('/', { replace: true });
      } else {
        setSuccess('Registration successful! Please sign in with your new credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-forecast/20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="font-serif text-3xl font-normal text-ink tracking-tight">
          StockVision
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          Create an account to access custom watchlists and saved forecast logs
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface border border-border p-6 sm:p-8 rounded-notebook space-y-6">
          <div className="border-b border-divider pb-3">
            <h2 className="font-serif text-xl font-normal text-ink">
              Create an account
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Enter your email and create a secure password.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-notebook bg-fall/10 border border-fall/20 text-fall text-xs flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-notebook bg-rise/10 border border-rise/20 text-rise text-xs flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{success}</span>
                <div className="mt-1">
                  <Link to="/login" className="font-medium underline text-ink">
                    Proceed to sign in →
                  </Link>
                </div>
              </div>
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

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-ink-muted pt-1">
            Already have an account?{' '}
            <Link to="/login" className="text-forecast hover:underline font-medium">
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
