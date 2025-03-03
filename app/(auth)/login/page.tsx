"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Sprout } from 'lucide-react';
import AuthDebug from '@/components/AuthDebug'; // Import debug component

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectChecked, setRedirectChecked] = useState(false);
  
  // Get auth context with safer access pattern
  const auth = useAuth();
  const { login, currentUser, loading: authLoading } = auth;
  
  const router = useRouter();

  // Add extra debug logging
  useEffect(() => {
    console.log("Login component mounted");
    console.log("Auth context available:", !!auth);
    console.log("Auth functions:", Object.keys(auth));
  }, [auth]);

  // Check if user is already logged in
  useEffect(() => {
    console.log("Login page: Auth state check", { 
      authLoading, 
      currentUser: currentUser ? 'exists' : 'null' 
    });
    
    // Clear any previous redirect markers
    if (typeof window !== 'undefined') {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('redirect_attempted_')) {
          keys.push(key);
        }
      }
      keys.forEach(key => sessionStorage.removeItem(key));
    }
    
    // Only redirect if we're not in a loading state and have a user
    if (!authLoading) {
      if (currentUser) {
        console.log("Login page: User already logged in, redirecting to dashboard");
        router.push('/dashboard');
      } else {
        setRedirectChecked(true);
      }
    }
  }, [currentUser, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Submit handler triggered");
    
    // Verify login function exists
    if (typeof login !== 'function') {
      console.error("Login function is not available:", login);
      setError('Authentication system not properly initialized');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      console.log("Attempting login with:", { email });
      await login(email, password);
      
      // Don't redirect here - let the useEffect handle it
      console.log("Login successful");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error instanceof Error) {
        setError('Failed to sign in: ' + error.message);
      } else {
        setError('Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading || !redirectChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking login status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-4">
      {/* Debug component - REMOVE AFTER DEBUGGING */}
      <AuthDebug />
      
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow">
        <div className="text-center">
          <div className="flex justify-center">
            <Sprout className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              href="/signup" 
              className="font-medium text-emerald-500 hover:text-emerald-600"
            >
              Sign up
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link 
                href="/reset-password" 
                className="font-medium text-emerald-500 hover:text-emerald-600"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}