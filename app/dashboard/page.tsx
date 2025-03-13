// app/dashboard/page.tsx
'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import UpdatedParentDashboard from '@/app/components/parent/UpdatedParentDashboard';
import { ErrorBoundary } from 'react-error-boundary';

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
    <ErrorBoundary fallback={<DashboardError />}>
      <Suspense fallback={<DashboardLoading />}>
        <UpdatedParentDashboard />
      </Suspense>
    </ErrorBoundary>
  );
}

// Add an error component
function DashboardError() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-xl">!</span>
        </div>
        <h2 className="text-xl font-medium text-gray-700">Something went wrong</h2>
        <p className="text-gray-500 mb-4">We couldn't load your dashboard</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}