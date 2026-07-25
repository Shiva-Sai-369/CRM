'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

type Tab = 'password' | 'magic';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePassword = () => {
    setError(null);
    setSuccessMsg(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    startTransition(async () => {
      const supabase = getBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
      } else {
        // Middleware / callback will redirect based on role
        window.location.href = '/auth/callback?next=/projects';
      }
    });
  };

  const handleMagicLink = () => {
    setError(null);
    setSuccessMsg(null);
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    startTransition(async () => {
      const supabase = getBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccessMsg('Check your inbox — a magic link is on its way.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">CRM Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Tab switcher */}
          <div className="flex bg-gray-800 rounded-xl p-1 mb-6 gap-1">
            <button
              id="tab-password"
              onClick={() => { setTab('password'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === 'password'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Password
            </button>
            <button
              id="tab-magic-link"
              onClick={() => { setTab('magic'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === 'magic'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Email field (shared) */}
          <div className="mb-4">
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  tab === 'password' ? handlePassword() : handleMagicLink();
                }
              }}
              placeholder="you@company.com"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              autoComplete="email"
            />
          </div>

          {/* Password field — only for password tab */}
          {tab === 'password' && (
            <div className="mb-6">
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePassword(); }}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                autoComplete="current-password"
              />
            </div>
          )}

          {tab === 'magic' && (
            <p className="text-xs text-gray-500 mb-6">
              We&apos;ll email you a one-time sign-in link. No password needed.
            </p>
          )}

          {/* Error / success feedback */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
              {successMsg}
            </div>
          )}

          {/* CTA button */}
          <button
            id="btn-sign-in"
            onClick={tab === 'password' ? handlePassword : handleMagicLink}
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            {isPending
              ? 'Please wait…'
              : tab === 'password'
              ? 'Sign In'
              : 'Send Magic Link'}
          </button>

          <p className="mt-5 text-center text-xs text-gray-600">
            No public sign-up. Accounts are created by invitation only.
          </p>
        </div>
      </div>
    </div>
  );
}
