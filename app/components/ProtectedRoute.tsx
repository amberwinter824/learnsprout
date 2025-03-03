"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthContextType } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Fix: Use explicit type casting for useAuth
  const auth = useAuth() as AuthContextType;
  const { currentUser, loading } = auth;
  
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    // Store the fact we've already tried to redirect to prevent loops
    const redirectKey = `redirect_attempted_${pathname}`;
    const hasAttemptedRedirect = sessionStorage.getItem(redirectKey);
    
    console.log("ProtectedRoute: Auth check", {
      loading,
      currentUser: currentUser ? 'exists' : 'null',
      pathname,
      hasAttemptedRedirect
    });
    
    // Only proceed with checks once loading is complete
    if (!loading) {
      if (!currentUser && !redirectAttempted && !hasAttemptedRedirect) {
        console.log("ProtectedRoute: No user, redirecting to login");
        // Mark that we've attempted a redirect for this route
        sessionStorage.setItem(redirectKey, 'true');
        setRedirectAttempted(true);
        router.push('/login');
      } else if (currentUser) {
        console.log("ProtectedRoute: User authenticated, allowing access");
        // Clear the redirect attempt marker since we're now authenticated
        sessionStorage.removeItem(redirectKey);
        setIsChecking(false);
      } else {
        // We already tried to redirect or have the marker set, don't redirect again
        console.log("ProtectedRoute: Redirect already attempted, preventing loop");
        setIsChecking(false);
      }
    }
  }, [currentUser, loading, router, pathname, redirectAttempted]);

  // Show loading state while authentication is being checked
  if (loading || (isChecking && !redirectAttempted)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your account...</p>
        </div>
      </div>
    );
  }

  // Show children once user is confirmed to be authenticated or after redirect attempt
  return children;
}