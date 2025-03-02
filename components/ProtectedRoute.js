"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    console.log("ProtectedRoute: Setting up auth listener");
    
    // Only proceed with checks once loading is complete
    if (!loading) {
      console.log("ProtectedRoute: Auth state changed:", currentUser ? "User is signed in" : "No user");
      
      if (!currentUser) {
        console.log("ProtectedRoute: Redirecting to login");
        router.push('/login');
      } else {
        console.log("ProtectedRoute: User authenticated, allowing access");
        setIsChecking(false);
      }
    }
  }, [currentUser, loading, router]);

  // Show loading state while authentication is being checked
  if (loading || (isChecking && !currentUser)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your account...</p>
        </div>
      </div>
    );
  }

  // Show children once user is confirmed to be authenticated
  return children;
}