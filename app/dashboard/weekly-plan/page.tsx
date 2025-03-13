'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import AllChildrenWeeklyView from '@/app/components/parent/AllChildrenWeeklyView';
import { ErrorBoundary } from 'react-error-boundary';

export default function WeeklyPlanPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Set loading to false once auth is complete
    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading]);
  
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Weekly Planner</h1>
          <p className="text-gray-600 mb-4">Please sign in to view your family's weekly plan.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Weekly Planner</h1>
      
      <ErrorBoundary
        fallback={
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-medium text-red-800 mb-2">Something went wrong</h2>
            <p className="text-red-600 mb-4">We couldn't load your weekly plan.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        }
      >
        <AllChildrenWeeklyView 
          parentId={currentUser.uid}
          onDailyViewRequest={() => window.history.back()}
        />
      </ErrorBoundary>
    </div>
  );
} 