"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * AuthGate - Displays a prominent message when user is not authenticated
 * Shows before any protected content loads
 * 
 * Usage: Wrap protected content or add at the top of any protected page
 * <AuthGate>{children}</AuthGate>
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const supabase = getSupabaseClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('[AuthGate] Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }

  // While checking, show loading
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show prominent message
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        {/* Background gradient blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600 rounded-full opacity-10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-600 rounded-full opacity-10 blur-3xl" />
        </div>

        <div className="relative max-w-md w-full">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/10 border-2 border-red-600/30 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
            <p className="text-gray-400">You need to sign in to access this page</p>
          </div>

          {/* Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8">
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mt-0.5">
                  <span className="text-red-500 text-xs">1</span>
                </div>
                <div>
                  <p className="text-gray-300">
                    Your session has expired or you're not logged in
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mt-0.5">
                  <span className="text-blue-500 text-xs">2</span>
                </div>
                <div>
                  <p className="text-gray-300">
                    Click the button below to go to the login page
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mt-0.5">
                  <span className="text-green-500 text-xs">3</span>
                </div>
                <div>
                  <p className="text-gray-300">
                    After signing in, you'll be redirected back
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                // Clear everything and redirect to login
                if (typeof window !== 'undefined') {
                  sessionStorage.clear();
                  window.location.href = '/login';
                }
              }}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              Go to Login
            </button>

            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 pt-6 border-t border-gray-800">
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer hover:text-gray-400">
                    Developer Info
                  </summary>
                  <div className="mt-2 space-y-1 font-mono">
                    <p>• Session check failed</p>
                    <p>• Middleware should have redirected</p>
                    <p>• Try hard refresh (Ctrl+Shift+R)</p>
                    <p>• Or clear browser cache</p>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-600 mt-6">
            If you keep seeing this after logging in,{' '}
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.clear();
                  sessionStorage.clear();
                  alert('Storage cleared. Please log in again.');
                  window.location.href = '/login';
                }
              }}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              clear your browser storage
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
}
