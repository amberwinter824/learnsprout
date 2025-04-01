import React from 'react';
import { CheckCircle, TrendingUp, Award } from 'lucide-react';
import Link from 'next/link';

interface ProgressCelebrationProps {
  childId: string;
  childName: string;
  recentMilestones: {
    skillName: string;
    status: 'emerging' | 'developing' | 'mastered';
    date: Date;
  }[];
}

export default function ProgressCelebration({ 
  childId, 
  childName, 
  recentMilestones 
}: ProgressCelebrationProps) {
  // Get the most significant milestone (preferring mastered > developing > emerging)
  const significantMilestone = [...recentMilestones].sort((a, b) => {
    const statusValue = { 'mastered': 3, 'developing': 2, 'emerging': 1 };
    return statusValue[b.status] - statusValue[a.status];
  })[0];
  
  if (!significantMilestone) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="mb-4">
          <Award className="h-12 w-12 text-amber-400 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {childName}'s Journey is Beginning!
        </h3>
        <p className="text-gray-600 mb-4">
          Track your first activity to start seeing progress milestones.
        </p>
        <Link
          href={`/dashboard/children/${childId}/activities`}
          className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200"
        >
          Find Activities
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-emerald-50 p-6 text-center">
        <div className="mb-4">
          {significantMilestone.status === 'mastered' ? (
            <Award className="h-16 w-16 text-amber-400 mx-auto" />
          ) : significantMilestone.status === 'developing' ? (
            <TrendingUp className="h-16 w-16 text-blue-500 mx-auto" />
          ) : (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          )}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {childName} is making progress!
        </h3>
        
        <p className="text-gray-700 mb-6">
          {significantMilestone.status === 'mastered' ? (
            <>
              {childName} has <span className="font-semibold text-green-700">mastered</span> {significantMilestone.skillName}!
            </>
          ) : significantMilestone.status === 'developing' ? (
            <>
              {childName} is <span className="font-semibold text-blue-700">developing</span> {significantMilestone.skillName}.
            </>
          ) : (
            <>
              {childName} is <span className="font-semibold text-amber-700">showing interest</span> in {significantMilestone.skillName}.
            </>
          )}
        </p>
        
        <div className="flex justify-center space-x-3">
          <Link
            href={`/dashboard/children/${childId}/progress`}
            className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200"
          >
            View Progress
          </Link>
          <Link
            href={`/dashboard/children/${childId}/activities`}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            Find More Activities
          </Link>
        </div>
      </div>
      
      {recentMilestones.length > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Recent Milestones
          </h4>
          <div className="space-y-2">
            {recentMilestones.slice(0, 3).map((milestone, index) => (
              <div key={index} className="flex items-center">
                {milestone.status === 'mastered' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                ) : milestone.status === 'developing' ? (
                  <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                ) : (
                  <Award className="h-4 w-4 text-amber-400 mr-2" />
                )}
                <span className="text-sm text-gray-600">{milestone.skillName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 