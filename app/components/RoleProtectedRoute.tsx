'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: ReactNode;
  requiredRole: string | string[]; // Can accept a single role or an array of roles
  redirectTo?: string; // Where to redirect if user doesn't have access
}

/**
 * Component to protect routes based on user roles
 * Usage: <RoleProtectedRoute requiredRole="educator">...</RoleProtectedRoute>
 */
export default function RoleProtectedRoute({ 
  children, 
  requiredRole, 
  redirectTo = '/dashboard' 
}: RoleProtectedRouteProps) {
  const { currentUser, hasRole, loading } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);
  
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        // If not logged in, redirect to login
        router.push('/login');
        return;
      }
      
      // Check if user has required role(s)
      if (Array.isArray(requiredRole)) {
        // If any of the required roles is allowed, grant access
        const hasAnyRole = requiredRole.some(role => hasRole(role));
        setHasAccess(hasAnyRole);
        
        if (!hasAnyRole) {
          router.push(redirectTo);
        }
      } else {
        // Check for a single required role
        const allowed = hasRole(requiredRole);
        setHasAccess(allowed);
        
        if (!allowed) {
          router.push(redirectTo);
        }
      }
      
      setChecking(false);
    }
  }, [currentUser, loading, requiredRole, hasRole, router, redirectTo]);
  
  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto" />
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }
  
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-medium">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}