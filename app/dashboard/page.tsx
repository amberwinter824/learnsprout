// app/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BookOpen, 
  BarChart2, 
  Settings, 
  Loader2,
  User
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import WeeklyPlanWithDayFocus from '@/app/components/parent/WeeklyPlanWithDayFocus';

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  
  // Parse URL parameters
  const dateParam = searchParams.get('date');
  const childIdParam = searchParams.get('childId');
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(
    dateParam ? new Date(dateParam) : new Date()
  );
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(
    childIdParam ?? undefined
  );
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  // Update URL when parameters change
  const updateUrlParams = useCallback((date?: Date, childId?: string) => {
    const params = new URLSearchParams();
    
    if (date) {
      params.set('date', format(date, 'yyyy-MM-dd'));
    }
    
    if (childId) {
      params.set('childId', childId);
    }
    
    // Replace current URL to maintain navigation history
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }, [router]);
  
  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    updateUrlParams(date, selectedChildId);
  }, [selectedChildId, updateUrlParams]);
  
  // Handle child selection
  const handleChildSelect = useCallback((childId: string) => {
    setSelectedChildId(childId);
    updateUrlParams(selectedDate, childId);
  }, [selectedDate, updateUrlParams]);
  
  // Handle generate plan
  const handleGeneratePlan = async (childId: string): Promise<void> => {
    if (!childId || !currentUser) {
      throw new Error('Missing child ID or user');
    }
    
    try {
      setIsGeneratingPlan(true);
      
      // Import and use your plan generator
      const { generateWeeklyPlan } = await import('@/lib/planGenerator');
      await generateWeeklyPlan(childId, currentUser.uid);
      
      // Don't return the result
    } catch (error) {
      console.error('Error generating plan:', error);
      throw error;
    } finally {
      setIsGeneratingPlan(false);
    }
  };
  
  // Initialize when auth is ready
  useEffect(() => {
    if (currentUser !== undefined) {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Loading state
  if (loading) {
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
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Dashboard</h1>
          <p className="text-gray-600">
            Welcome to Learn Sprout, your personalized Montessori learning companion
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Moved up for mobile view */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {/* Unified Weekly Plan with Day Focus */}
            <WeeklyPlanWithDayFocus 
              selectedDate={selectedDate}
              selectedChildId={selectedChildId}
              onGeneratePlan={handleGeneratePlan}
            />
          </div>
          
          {/* Sidebar - Moved down for mobile view */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h2>
              
              <div className="space-y-2">
                <Link
                  href="/dashboard/activities"
                  className="flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <BookOpen className="h-5 w-5 mr-3 text-emerald-500" />
                  <span>Activity Library</span>
                </Link>
                
                <Link
                  href="/dashboard/progress"
                  className="flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <BarChart2 className="h-5 w-5 mr-3 text-emerald-500" />
                  <span>Progress Tracking</span>
                </Link>
                
                <Link
                  href="/dashboard/settings"
                  className="flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <Settings className="h-5 w-5 mr-3 text-emerald-500" />
                  <span>Settings</span>
                </Link>
              </div>
            </div>
            
            {/* App Features Section */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Learn Sprout Features</h2>
              
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <h3 className="font-medium text-emerald-800 text-sm">Weekly Activity Plans</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Personalized activities based on your child's age and interests.
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800 text-sm">Progress Tracking</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Document observations and track developmental milestones.
                  </p>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h3 className="font-medium text-purple-800 text-sm">Montessori Resources</h3>
                  <p className="text-xs text-purple-700 mt-1">
                    Access educational resources and activity guides.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}