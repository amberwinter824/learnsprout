'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function AuthDebug() {
  const auth = useAuth();
  
  useEffect(() => {
    console.log("Auth Debug - Context Contents:", Object.keys(auth));
    console.log("Auth Debug - Login function:", typeof auth.login);
  }, [auth]);
  
  return (
    <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 mb-4 rounded">
      <h2 className="font-bold mb-2">Auth Debug Info</h2>
      <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-32">
        {JSON.stringify({
          isAuthenticated: !!auth.currentUser,
          isLoading: auth.loading,
          hasLoginFunction: typeof auth.login === 'function'
        }, null, 2)}
      </pre>
    </div>
  );
}