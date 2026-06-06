'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const [redirectPath, setRedirectPath] = useState('/');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    setRedirectPath(urlParams.get('redirect') || '/');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push(redirectPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="container mx-auto flex h-[calc(100vh-64px)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/50 p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="mb-2 text-2xl font-bold text-white">Welcome back</h1>
        <p className="mb-8 text-zinc-400">Sign in to your account</p>

        <a href="/api/auth/tiktok" className="w-full rounded-lg bg-[#000000] py-3 font-semibold text-white hover:bg-opacity-90 disabled:opacity-50 transition-all mt-4 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M12.527 2.002c.39.382.72.846 1.002 1.345.286.508.487 1.072.603 1.667.11.57.14 1.156.096 1.738a5.21 5.21 0 0 1-.576 1.948 5.43 5.43 0 0 1-1.3 1.543c-.56.42-1.2.71-1.87.857-.68.15-1.37.14-2.04-.03-1.42-.36-2.68-1.2-3.56-2.37-.9-1.2-1.37-2.67-1.32-4.14.04-.68.18-1.35.4-1.99.23-.62.53-1.2.9-1.72.37-.53.8-.98 1.28-1.35.48-.36.99-.65 1.52-.85s1.08-.3 1.64-.31c.56 0 1.12.08 1.66.24Z"/><path d="M12.238 21.998c.39.382.72.846 1.002 1.345.286.508.487 1.072.603 1.667.11.57.14 1.156.096 1.738a5.21 5.21 0 0 1-.576 1.948 5.43 5.43 0 0 1-1.3 1.543c-.56.42-1.2.71-1.87.857-.68.15-1.37.14-2.04-.03-1.42-.36-2.68-1.2-3.56-2.37-.9-1.2-1.37-2.67-1.32-4.14.04-.68.18-1.35.4-1.99.23-.62.53-1.2.9-1.72.37-.53.8-.98 1.28-1.35.48-.36.99-.65 1.52-.85s1.08-.3 1.64-.31c.56 0 1.12.08 1.66.24Z"/></svg>
          Sign in with TikTok
        </a>

        <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-400"></div>
            <span className="flex-shrink mx-4 text-gray-400">OR</span>
            <div className="flex-grow border-t border-gray-400"></div>
        </div>


        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-all mt-4"
          >
            {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link href={redirectPath !== '/' ? `/register?redirect=${encodeURIComponent(redirectPath)}` : "/register"} className="text-white hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
