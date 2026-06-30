'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'worker')[];
  fallbackPath?: string;
}

/**
 * Component that restricts access based on user role
 * Redirects to fallback path if user doesn't have required role
 */
export default function RoleGuard({
  children,
  allowedRoles,
  fallbackPath,
}: RoleGuardProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile) {
      const hasAccess = allowedRoles.includes(profile.role);
      
      if (!hasAccess) {
        // Redirect based on user's actual role if no fallback specified
        const redirectPath = fallbackPath || 
          (profile.role === 'admin' ? '/admin/dashboard' : '/worker/dashboard');
        router.push(redirectPath);
      }
    }
  }, [profile, loading, allowedRoles, fallbackPath, router]);

  // Show loading spinner while checking role
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // If user doesn't have access, show nothing (will redirect)
  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
