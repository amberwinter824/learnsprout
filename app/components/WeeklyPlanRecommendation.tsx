'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChildWeeklyPlans } from '@/lib/dataService';
import { generateWeeklyPlan } from '@/lib/planGenerator';
import { Loader2, Calendar, ArrowRight, ShieldAlert } from 'lucide-react';

interface WeeklyPlanRecommendationProps {
  childId: string;
  childName: string;
  userId?: string;
  childData?: {
    lastPlanGenerated?: any;
    [key: string]: any;
  };
}

export default function WeeklyPlanRecommendation({ 
  childId, 
  childName, 
  userId, 
  childData = {} 
}: WeeklyPlanRecommendationProps) {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [recentPlanId, setRecentPlanId] = useState<string | null>(null);
  const router = useRouter();

  // New: Fetch most recent plan on component mount
  useEffect(() => {
    async function checkExistingPlan() {
      try {
        const childPlans = await getChildWeeklyPlans(childId);
        if (childPlans && childPlans.length > 0 && childPlans[0].id) {
          setRecentPlanId(childPlans[0].id || null);
        }
      } catch (err) {
        console.error("Error checking for existing plans:", err);
      }
    }
    
    if (childId) {
      checkExistingPlan();
    }
  }, [childId]);

  // Format the last generated date safely
  const formatLastGenerated = (): string => {
    if (!childData || !childData.lastPlanGenerated) {
      return "Never";
    }
    
    try {
      // Handle both Firestore Timestamp and regular Date objects
      const dateObj = childData.lastPlanGenerated.toDate 
        ? childData.lastPlanGenerated.toDate() 
        : new Date(childData.lastPlanGenerated);
        
      return dateObj.toLocaleString();
    } catch (err) {
      console.error("Error formatting date:", err);
      return "Unknown";
    }
  };

  const handleGeneratePlan = async (): Promise<void> => {
    if (!childId || !userId) {
      setError('Missing required information');
      return;
    }
    
    try {
      setIsGenerating(true);
      setError('');
      
      const plan = await generateWeeklyPlan(childId, userId);
      
      // Store the new plan ID for rendering the "View Current Plan" button
      setRecentPlanId(plan.id || null);
      
      // Redirect to the weekly plan page with the new plan ID
      router.push(`/dashboard/children/${childId}/weekly-plan?planId=${plan.id}`);
    } catch (err: any) {
      console.error('Error generating weekly plan:', err);
      setError('Failed to generate weekly plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex items-center">
        <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
        <h2 className="text-lg font-medium text-gray-900">Weekly Plan Recommendation</h2>
      </div>
      
      <div className="p-6">
        <p className="text-gray-600 mb-6">
          Generate a personalized weekly plan for {childName} based on their developmental needs,
          interests, and progress. The plan will include suggested activities timed throughout the week
          to support skill development.
        </p>
        
        <div className="bg-emerald-50 p-4 rounded-md flex items-start mb-6">
          <div className="mr-3 mt-1">
            <ShieldAlert className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-emerald-800 mb-1">AI-Powered Recommendations</h3>
            <p className="text-sm text-emerald-700">
              Our system analyzes {childName}'s progress on developmental skills, previous activities, and
              engagement levels to recommend the most appropriate activities for continued growth.
            </p>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-500">
            Last generated: <span className="font-medium">{formatLastGenerated()}</span>
          </div>
          
          <div className="space-x-3">
            {recentPlanId && (
              <Link
                href={`/dashboard/children/${childId}/weekly-plan?planId=${recentPlanId}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                View Current Plan
              </Link>
            )}
            
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Weekly Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}