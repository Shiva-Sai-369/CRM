'use client';

import { useState, useTransition } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
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
      
      console.log('[login] Attempting sign in with password...');
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (authError) {
        console.error('[login] Sign in failed:', authError);
        setError('Invalid email or password.');
        return;
      }

      console.log('[login] Sign in successful, fetching user profile...');

      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[login] Failed to get user after sign in:', userError);
        setError('Authentication succeeded but failed to load user. Please try again.');
        return;
      }

      // Fetch profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('[login] Failed to fetch profile:', profileError);
        setError('Failed to load user profile. Please try again.');
        return;
      }

      console.log('[login] Profile loaded, role:', profile.role);

      // Redirect based on role (same logic as callback route)
      if (profile.role === 'client') {
        // Fetch client's project assignments
        const { data: assignments, error: assignError } = await supabase
          .from('project_assignments')
          .select('project_id')
          .eq('user_id', user.id)
          .limit(1);

        if (assignError) {
          console.error('[login] Failed to fetch project assignments:', assignError);
          setError('Failed to load project assignments. Please try again.');
          return;
        }

        const projectId = (assignments as Array<{ project_id: number }> | null)?.[0]?.project_id;
        if (projectId) {
          console.log('[login] Redirecting client to analytics:', projectId);
          window.location.href = `/analytics/${projectId}`;
        } else {
          console.warn('[login] Client has no project assignments');
          window.location.href = '/login?error=no_project';
        }
      } else {
        // super_admin or team_member -> /projects
        console.log('[login] Redirecting', profile.role, 'to /projects');
        window.location.href = '/projects';
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
          <h1 className="text-2xl font-bold text-white">Webrocket CRM</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Email field */}
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
                  handlePassword();
                }
              }}
              placeholder="you@company.com"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              autoComplete="email"
            />
          </div>

          {/* Password field */}
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
            onClick={handlePassword}
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            {isPending ? 'Please wait…' : 'Sign In'}
          </button>

          <p className="mt-5 text-center text-xs text-gray-600">
            No public sign-up. Accounts are created by your admin.
          </p>
        </div>
      </div>
    </div>
  );
}
