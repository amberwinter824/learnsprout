// components/WeeklyPlanRecommendation.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateWeeklyPlan } from '@/lib/planGenerator';
import { Loader2, Calendar, ArrowRight, ShieldAlert } from 'lucide-react';

export default function WeeklyPlanRecommendation({ childId, childName, userId }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGeneratePlan = async () => {
    if (!childId || !userId) {
      setError('Missing required information');
      return;
    }
    
    try {
      setIsGenerating(true);
      setError('');
      
      const plan = await generateWeeklyPlan(childId, userId);
      
      // Redirect to the weekly plan page with the new plan ID
      router.push(`/dashboard/children/${childId}/weekly-plan?planId=${plan.id}`);
    } catch (err) {
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
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Last generated: <span className="font-medium">Never</span>
          </div>
          
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
  );
}