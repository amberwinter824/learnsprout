"use client"
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestPage() {
  const [authState, setAuthState] = useState('Loading...');
  
  useEffect(() => {
    try {
      // Just log the auth object, don't try to use it yet
      console.log('Auth context:', useAuth());
      setAuthState('Auth context loaded');
    } catch (error) {
      console.error('Error accessing auth context:', error);
      setAuthState(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      <p className="mb-4">{authState}</p>
    </div>
  );
} 