"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import toast from "react-hot-toast";

/**
 * SessionMonitor - Monitors user authentication session and warns before expiry
 * 
 * Features:
 * - Checks session every minute
 * - Warns when session expires in < 5 minutes
 * - Auto-redirects to login when session expires
 * - Silent monitoring (no UI)
 * - Disabled on login page to avoid confusion
 * 
 * Usage: Add once to app layout
 * <SessionMonitor />
 */
export default function SessionMonitor() {
  const [warningShown, setWarningShown] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Don't run on login page or public pages
    if (pathname === '/login' || pathname === '/set-password') {
      return;
    }
    const supabase = getSupabaseClient();
    
    // Initial check
    checkSession();
    
    // Check session every minute
    const interval = setInterval(() => {
      checkSession();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);

    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[SessionMonitor] Error checking session:', error);
          return;
        }
        
        if (!session) {
          // Session expired - show error and redirect
          console.warn('[SessionMonitor] Session expired, redirecting to login');
          
          toast.error("Your session has expired. Please log in again.", {
            duration: 10000,
            position: "top-center",
            id: "session-expired" // Prevent duplicate toasts
          });
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            // Clear storage to ensure clean state
            sessionStorage.clear();
            window.location.href = "/login";
          }, 3000);
          
          clearInterval(interval);
          return;
        }
        
        // Warn if session expires soon (< 5 minutes)
        if (session.expires_at) {
          const expiresAt = new Date(session.expires_at * 1000);
          const now = new Date();
          const minutesLeft = (expiresAt.getTime() - now.getTime()) / 1000 / 60;
          
          if (minutesLeft < 5 && minutesLeft > 0 && !warningShown) {
            console.warn('[SessionMonitor] Session expires in', Math.floor(minutesLeft), 'minutes');
            
            toast("Your session will expire soon. Save your work!", {
              icon: "⏰",
              duration: 5000,
              id: "session-warning"
            });
            
            setWarningShown(true);
          }
          
          // Reset warning if session was refreshed
          if (minutesLeft > 10 && warningShown) {
            setWarningShown(false);
          }
        }
      } catch (error) {
        console.error('[SessionMonitor] Unexpected error:', error);
      }
    }
  }, [warningShown]);

  return null; // No UI, just monitoring
}
