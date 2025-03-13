// app/dashboard/page.tsx
'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import ImprovedParentDashboard from '@/app/components/parent/ImprovedParentDashboard';
import PWAInstallPrompt from '@/app/components/PWAInstallPrompt';

// Loading component for suspense fallback
function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-700">Loading your dashboard...</h2>
        <p className="text-gray-500">Just a moment please</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, loading } = useAuth();
  
  // Show loading while auth loads
  if (loading) {
    return <DashboardLoading />;
  }
  
  // Render the dashboard with suspense for any other loading states
  return (
    <>
      <Suspense fallback={<DashboardLoading />}>
        <ImprovedParentDashboard hideAddChild={true} hideMontessoriResources={true} />
      </Suspense>
      
      <PWAInstallPrompt />
    </>
  );
}