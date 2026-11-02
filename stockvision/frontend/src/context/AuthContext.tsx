import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { api } from '../services/api';

interface AuthContextType {
  user: User | { id: string; email: string } | null;
  session: Session | null;
  token: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data?: any }>;
  signOut: () => Promise<void>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  token: null,
  isAdmin: false,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  isDemoMode: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | { id: string; email: string } | null>(() => {
    const saved = localStorage.getItem('sv_user') || localStorage.getItem('sv_demo_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sv_token'));
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('sv_is_admin') === 'true');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const checkAndSetAdmin = (u: any, t?: string | null) => {
    const adminFlag = Boolean(
      u?.user_metadata?.is_admin ||
      u?.app_metadata?.is_admin ||
      (u?.email && u.email.toLowerCase().startsWith('admin@')) ||
      (t && t.includes('admin')) ||
      localStorage.getItem('sv_is_admin') === 'true'
    );
    setIsAdmin(adminFlag);
    localStorage.setItem('sv_is_admin', adminFlag ? 'true' : 'false');
  };

  useEffect(() => {
    // If Supabase is fully configured with real keys
    if (isSupabaseConfigured && supabase) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          const t = session.access_token ?? null;
          setToken(t);
          api.setToken(t);
          checkAndSetAdmin(session.user, t);
          if (t) localStorage.setItem('sv_token', t);
          localStorage.setItem('sv_user', JSON.stringify({ id: session.user.id, email: session.user.email }));
        } else {
          // Check for local demo session fallback
          const savedUser = localStorage.getItem('sv_demo_user');
          const savedToken = localStorage.getItem('sv_token');
          if (savedUser && savedToken) {
            try {
              const parsed = JSON.parse(savedUser);
              setUser(parsed);
              setToken(savedToken);
              api.setToken(savedToken);
              checkAndSetAdmin(parsed, savedToken);
              setIsDemoMode(true);
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
        setIsLoading(false);
      });

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          const t = session.access_token ?? null;
          setToken(t);
          api.setToken(t);
          checkAndSetAdmin(session.user, t);
          if (t) localStorage.setItem('sv_token', t);
          localStorage.setItem('sv_user', JSON.stringify({ id: session.user.id, email: session.user.email }));
        }
        setIsLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Local demo mode (Supabase keys not yet configured)
      const savedUser = localStorage.getItem('sv_demo_user');
      const savedToken = localStorage.getItem('sv_token');
      if (savedUser && savedToken) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          setToken(savedToken);
          api.setToken(savedToken);
          checkAndSetAdmin(parsed, savedToken);
          setIsDemoMode(true);
        } catch {
          // ignore corrupted local storage
        }
      }
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setIsLoading(false);
      if (error) return { error };
      if (data.session) {
        setUser(data.user);
        setSession(data.session);
        setToken(data.session.access_token);
        api.setToken(data.session.access_token);
        checkAndSetAdmin(data.user, data.session.access_token);
        localStorage.setItem('sv_token', data.session.access_token);
        if (data.user) {
          localStorage.setItem('sv_user', JSON.stringify({ id: data.user.id, email: data.user.email }));
        }
      }
      return { error: null };
    } else {
      // Offline / Demo fallback
      const isAdm = email.toLowerCase().startsWith('admin@');
      const demoUser = {
        id: isAdm ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
        email: email || 'student@stockvision.edu',
      };
      const demoToken = isAdm ? 'demo-admin-token' : 'demo-token-' + btoa(email || 'student@stockvision.edu');
      setUser(demoUser);
      setToken(demoToken);
      setIsAdmin(isAdm);
      setIsDemoMode(true);
      api.setToken(demoToken);
      localStorage.setItem('sv_demo_user', JSON.stringify(demoUser));
      localStorage.setItem('sv_token', demoToken);
      localStorage.setItem('sv_is_admin', isAdm ? 'true' : 'false');
      setIsLoading(false);
      return { error: null };
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setIsLoading(false);
      return { error, data };
    } else {
      // Offline / Demo fallback
      const isAdm = email.toLowerCase().startsWith('admin@');
      const demoUser = {
        id: isAdm ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
        email: email,
      };
      const demoToken = isAdm ? 'demo-admin-token' : 'demo-token-' + btoa(email);
      setUser(demoUser);
      setToken(demoToken);
      setIsAdmin(isAdm);
      setIsDemoMode(true);
      api.setToken(demoToken);
      localStorage.setItem('sv_demo_user', JSON.stringify(demoUser));
      localStorage.setItem('sv_token', demoToken);
      localStorage.setItem('sv_is_admin', isAdm ? 'true' : 'false');
      setIsLoading(false);
      return { error: null, data: { user: demoUser } };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setToken(null);
    setIsAdmin(false);
    setIsDemoMode(false);
    api.setToken(null);
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_user');
    localStorage.removeItem('sv_demo_user');
    localStorage.removeItem('sv_is_admin');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

