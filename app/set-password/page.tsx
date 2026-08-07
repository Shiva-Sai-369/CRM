'use client';

import { useState, useEffect, useTransition } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export default function SetPasswordPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [destination, setDestination] = useState<string>('/projects');

  // Fetch user email and destination on mount
  useEffect(() => {
    const supabase = getBrowserClient();
    
    console.log('[set-password] Page loaded, checking session...');
    
    // Get current user
    supabase.auth.getUser().then(({ data: { user }, error: userError }) => {
      if (userError || !user) {
        console.error('[set-password] No session found:', userError);
        // No session, redirect to login
        window.location.href = '/login?error=no_session';
        return;
      }
      console.log('[set-password] Session valid for:', user.email);
      setEmail(user.email || '');
    });

    // Read and validate destination query parameter
    const params = new URLSearchParams(window.location.search);
    const dest = params.get('destination');
    
    console.log('[set-password] Destination parameter:', dest);
    
    if (dest) {
      // Validate destination for security
      // Must start with /, must NOT start with //, must NOT contain protocol
      if (
        dest.startsWith('/') &&
        !dest.startsWith('//') &&
        !dest.includes('http://') &&
        !dest.includes('https://')
      ) {
        setDestination(dest);
        console.log('[set-password] Destination validated:', dest);
      } else {
        // Invalid destination, fall back to /projects
        console.warn('[set-password] Invalid destination, falling back to /projects');
        setDestination('/projects');
      }
    } else {
      console.log('[set-password] No destination provided, using default /projects');
    }
  }, []);

  const handleSubmit = () => {
    setError(null);

    // Validate inputs
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password.');
      return;
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const supabase = getBrowserClient();
      
      console.log('[set-password] Starting password update for:', email);
      
      // Call Supabase updateUser API to set password and metadata
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: { password_set: true }
      });

      if (updateError) {
        console.error('[set-password] Password update failed:', updateError);
        setError(updateError.message);
        return;
      }

      console.log('[set-password] Password updated successfully');

      // CRITICAL: After updateUser, the session should still be valid
      // Verify the user is still authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('[set-password] Session lost after password update. Re-authenticating...', userError);
        
        // Session was invalidated - sign in with new password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (signInError) {
          console.error('[set-password] Re-authentication failed:', signInError);
          setError('Password set but login failed. Please try logging in manually.');
          return;
        }
        
        console.log('[set-password] Re-authenticated successfully');
      }

      // Success - user is authenticated with password set
      console.log('[set-password] Redirecting to:', destination);
      window.location.href = destination;
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Set Your Password</h1>
          <p className="text-gray-400 text-sm mt-1">Create a password to secure your account</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Email field (read-only) */}
          <div className="mb-4">
            <label htmlFor="user-email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email address
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 text-sm focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* Password field */}
          <div className="mb-4">
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500 mt-1.5">Minimum 8 characters</p>
          </div>

          {/* Confirm password field */}
          <div className="mb-6">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              autoComplete="new-password"
            />
          </div>

          {/* Error feedback */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* CTA button */}
          <button
            id="btn-set-password"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            {isPending ? 'Setting password…' : 'Set Password & Continue'}
          </button>

          <p className="mt-5 text-center text-xs text-gray-600">
            Your password will be used for future sign-ins
          </p>
        </div>
      </div>
    </div>
  );
}
