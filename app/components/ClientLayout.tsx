"use client"

import { Suspense } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import RootLoading from '../loading'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<RootLoading />}>
      <AuthProvider>{children}</AuthProvider>
    </Suspense>
  );
} 