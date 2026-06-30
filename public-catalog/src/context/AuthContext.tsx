'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  premiumCreator?: boolean;
  stripeConnectAccountId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function friendlyAuthErrorMessage(input: unknown): string {
  const raw = typeof input === 'string' ? input : '';
  const code = raw.trim().toLowerCase();
  if (!code) return 'Request failed';

  if (code === 'password_too_short') return 'Password must be at least 6 characters. Recommended: 12+ characters with letters, numbers, and a symbol.';
  if (code === 'missing_email_or_password') return 'Please enter your email and password.';
  if (code === 'supabase_not_configured') return 'Sign up is temporarily unavailable (Supabase not configured).';

  return raw;
}

async function postAuth<TBody extends Record<string, unknown>>(path: string, body: TBody) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!res) throw new Error('Failed to fetch. Please check your connection and try again.');

  const contentType = res.headers.get('content-type') || '';
  const json = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
  const ok = Boolean(json && typeof json === 'object' && (json as Record<string, unknown>).success === true);
  const err = json && typeof json === 'object' ? (json as Record<string, unknown>).error : null;

  if (!res.ok || !ok) throw new Error(friendlyAuthErrorMessage(err) || `Request failed (HTTP ${res.status})`);
  return json as Record<string, unknown>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await postAuth('/api/auth/login', { email, password });
      const u = (data.user || null) as User | null;
      if (!u) throw new Error('Login failed');
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const data = await postAuth('/api/auth/register', { email, password, name });
      const u = (data.user || null) as User | null;
      if (!u) throw new Error('Registration failed');
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
