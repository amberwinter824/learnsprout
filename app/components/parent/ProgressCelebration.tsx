import { FC, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaStar, FaArrowUp, FaSeedling, FaChevronRight } from 'react-icons/fa';
import { Flower2, Sprout, Leaf, CircleDot, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';

interface Milestone {
  id: string;
  skillId: string;
  skillName: string;
  status: 'mastered' | 'developing' | 'emerging' | 'not_started';
  lastAssessed: string;
}

interface ProgressCelebrationProps {
  childId: string;
  childName: string;
  recentMilestones: Milestone[];
  showProgressLinks?: boolean;
}

type SkillStatus = 'mastered' | 'developing' | 'emerging' | 'not_started';

const ProgressCelebration: FC<ProgressCelebrationProps> = ({
  childId,
  childName,
  recentMilestones,
  showProgressLinks = true
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const pathname = usePathname();
  const isOnProgressPage = pathname === `/dashboard/children/${childId}/development`;

  const sortedMilestones = [...recentMilestones].sort((a, b) => {
    const statusOrder: Record<SkillStatus, number> = {
      mastered: 3,
      developing: 2,
      emerging: 1,
      not_started: 0
    };
    return statusOrder[b.status] - statusOrder[a.status];
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mastered':
        return <Flower2 className="h-4 w-4" />;
      case 'developing':
        return <Sprout className="h-4 w-4" />;
      case 'emerging':
        return <Leaf className="h-4 w-4" />;
      case 'not_started':
        return <CircleDot className="h-4 w-4" />;
      default:
        return <CircleDot className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'text-green-500';
      case 'developing':
        return 'text-blue-500';
      case 'emerging':
        return 'text-amber-500';
      case 'not_started':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'mastered';
      case 'developing':
        return 'is developing';
      case 'emerging':
        return 'is beginning to learn';
      default:
        return '';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'Fully bloomed and thriving independently';
      case 'developing':
        return 'Growing steadily with support';
      case 'emerging':
        return 'First leaves appearing';
      case 'not_started':
        return 'Seed ready to be planted';
      default:
        return '';
    }
  };

  const statusCounts = recentMilestones.reduce((acc, milestone) => {
    acc[milestone.status] = (acc[milestone.status] || 0) + 1;
    return acc;
  }, { mastered: 0, developing: 0, emerging: 0, not_started: 0 } as Record<SkillStatus, number>);

  const totalMilestones = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  if (!recentMilestones.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <p className="text-gray-600">
          No recent progress to celebrate yet. Keep working with {childName}!
        </p>
        {showProgressLinks && (
          <div className="mt-4">
            <Link
              href={`/dashboard/children/${childId}/weekly-plan`}
              className="text-blue-600 hover:text-blue-800 font-medium mr-6"
            >
              Find Activities
            </Link>
          </div>
        )}
      </div>
    );
  }

  const mostSignificantMilestone = sortedMilestones[0];

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">{childName}</h3>
        {!isOnProgressPage && (
          <Link
            href={`/dashboard/children/${childId}/development`}
            className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            View child's development
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Link>
        )}
      </div>
      
      <div className="space-y-3">
        {sortedMilestones.slice(0, 3).map((milestone, index) => (
          <div key={milestone.id} className="relative">
            {/* Progress bar background */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              {/* Progress bar fill */}
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  milestone.status === 'mastered' 
                    ? 'bg-emerald-500' 
                    : milestone.status === 'developing'
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ 
                  width: `${milestone.status === 'mastered' ? '100%' : 
                          milestone.status === 'developing' ? '60%' : '30%'}`
                }}
              />
            </div>
            
            {/* Milestone details */}
            <div className="mt-1.5 flex items-start justify-between">
              <div className="flex-1 flex items-center">
                <div className={`mr-2 ${getStatusColor(milestone.status)}`}>
                  {getStatusIcon(milestone.status)}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {milestone.skillName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(milestone.lastAssessed), 'MMM d')}
                  </p>
                </div>
              </div>
              
              {/* Status indicator */}
              <div className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                milestone.status === 'mastered' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : milestone.status === 'developing'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Progress summary */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <Flower2 className="h-3 w-3 text-emerald-500 mr-1" />
              <span className="text-gray-600">Mastered</span>
            </div>
            <div className="flex items-center">
              <Sprout className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-gray-600">Developing</span>
            </div>
            <div className="flex items-center">
              <Leaf className="h-3 w-3 text-amber-500 mr-1" />
              <span className="text-gray-600">Emerging</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressCelebration; 