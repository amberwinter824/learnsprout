import React from 'react';
import Link from 'next/link';
import { Award, Sparkles, TrendingUp } from 'lucide-react';

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
  // Sort milestones by significance (mastered > developing > emerging)
  const sortedMilestones = [...recentMilestones].sort((a, b) => {
    const statusOrder = { mastered: 3, developing: 2, emerging: 1 };
    return statusOrder[b.status] - statusOrder[a.status];
  });

  // Find the most significant milestone
  const mostSignificantMilestone = sortedMilestones[0];

  // Get appropriate message and icon based on status
  const getStatusInfo = (status: 'emerging' | 'developing' | 'mastered') => {
    switch (status) {
      case 'mastered':
        return {
          message: 'has mastered',
          icon: Award,
          color: 'text-green-500'
        };
      case 'developing':
        return {
          message: 'is developing',
          icon: TrendingUp,
          color: 'text-blue-500'
        };
      case 'emerging':
        return {
          message: 'is showing interest in',
          icon: Sparkles,
          color: 'text-amber-500'
        };
      default:
        return {
          message: 'is working on',
          icon: TrendingUp,
          color: 'text-gray-500'
        };
    }
  };

  const statusInfo = mostSignificantMilestone ? getStatusInfo(mostSignificantMilestone.status) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{childName}</h3>
          {mostSignificantMilestone && statusInfo && (
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <statusInfo.icon className={`h-4 w-4 mr-1 ${statusInfo.color}`} />
              <span>
                {statusInfo.message} <span className="font-medium">{mostSignificantMilestone.skillName}</span>
              </span>
            </div>
          )}
        </div>
        <Link
          href={`/dashboard/children/${childId}/progress`}
          className="text-sm text-emerald-600 hover:text-emerald-700"
        >
          View Progress
        </Link>
      </div>

      {recentMilestones.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Recent Milestones</div>
          <div className="space-y-2">
            {recentMilestones.map((milestone, index) => {
              const info = getStatusInfo(milestone.status);
              return (
                <div key={index} className="flex items-center text-sm">
                  <info.icon className={`h-4 w-4 mr-2 ${info.color}`} />
                  <span className="text-gray-600">
                    {milestone.skillName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          href={`/dashboard/activities?childId=${childId}`}
          className="text-xs text-emerald-600 hover:text-emerald-700"
        >
          Find Activities
        </Link>
        <span className="text-gray-300">•</span>
        <Link
          href={`/dashboard/children/${childId}/progress`}
          className="text-xs text-emerald-600 hover:text-emerald-700"
        >
          View Progress
        </Link>
      </div>
    </div>
  );
} 