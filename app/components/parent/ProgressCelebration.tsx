import { FC, useState } from 'react';
import Link from 'next/link';
import { FaStar, FaArrowUp, FaSeedling } from 'react-icons/fa';
import { Flower2, Sprout, Leaf, CircleDot } from 'lucide-react';
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
              href={`/dashboard/children/${childId}/activities`}
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
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="space-y-4">
        <div className="flex items-start">
          <div className="mr-3 mt-1">
            <div 
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onTouchStart={() => setShowTooltip(!showTooltip)}
            >
              <div className={`${getStatusColor(mostSignificantMilestone.status)}`}>
                {getStatusIcon(mostSignificantMilestone.status)}
              </div>
              <div className={`absolute left-0 top-0 z-10 bg-white p-2 rounded-lg shadow-lg text-sm text-gray-700 whitespace-nowrap transform -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 ${
                showTooltip ? 'visible' : 'invisible'
              }`}>
                {getStatusDescription(mostSignificantMilestone.status)}
                {/* Mobile touch indicator */}
                <div className="sm:hidden absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-white border-r-[6px] border-r-transparent"></div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-gray-800">
              <span className="font-medium">{childName}</span>{' '}
              {getStatusMessage(mostSignificantMilestone.status)}{' '}
              <span className="font-medium">{mostSignificantMilestone.skillName}</span>!
            </p>
            {sortedMilestones.length > 1 && (
              <p className="text-gray-600 mt-2">
                Plus {sortedMilestones.length - 1} more recent milestone
                {sortedMilestones.length > 2 ? 's' : ''}!
              </p>
            )}
          </div>
        </div>

        {showProgressLinks && (
          <div className="flex gap-4 mt-4">
            <Link
              href={`/dashboard/children/${childId}/progress`}
              className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
            >
              View Progress
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressCelebration; 