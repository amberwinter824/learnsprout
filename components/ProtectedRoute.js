"use client";
import React, { useEffect, useState } from 'react'; // Add React import
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ProtectedRoute({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("ProtectedRoute: Setting up auth listener");
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("ProtectedRoute: Auth state changed:", user ? "User is signed in" : "No user");
      
      setCurrentUser(user);
      setLoading(false);
      
      if (!user) {
        console.log("ProtectedRoute: No user, redirecting to login");
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Show loading state or nothing while checking auth
  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // If we have a user, render the children
  return children;
}