'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export default function Providers({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const pathname = usePathname();
  const isAuthPath = 
    pathname?.startsWith('/login') || 
    pathname?.startsWith('/signup') || 
    pathname?.startsWith('/reset-password');

  const isDashboardPath = pathname?.startsWith('/dashboard');

  // Conditionally wrap in AuthProvider only for paths that need it
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}