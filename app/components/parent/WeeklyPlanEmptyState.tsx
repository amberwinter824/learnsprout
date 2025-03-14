// components/parent/WeeklyPlanEmptyState.tsx
import { Calendar, Settings } from 'lucide-react';
import Link from 'next/link';

interface WeeklyPlanEmptyStateProps {
  childId: string;
  childName: string;
  onGeneratePlan: () => void;
  isGenerating: boolean;
}

export default function WeeklyPlanEmptyState({ 
  childId, 
  childName, 
  onGeneratePlan,
  isGenerating
}: WeeklyPlanEmptyStateProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
      <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-800 mb-2">No Weekly Plan Yet</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {childName} doesn't have activities planned for this week. Generate a personalized
        weekly plan based on their age, interests, and development needs.
      </p>
      
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button
          onClick={onGeneratePlan}
          disabled={isGenerating}
          className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
        >
          {isGenerating ? (
            <>Generating Plan...</>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Generate Weekly Plan
            </>
          )}
        </button>
        
        <Link
          href={`/dashboard/settings`}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
        >
          <Settings className="h-4 w-4 mr-2" />
          Adjust Activity Preferences
        </Link>
      </div>
    </div>
  );
}