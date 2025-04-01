import { FC } from 'react';
import Link from 'next/link';
import { FaStar, FaArrowUp, FaSeedling } from 'react-icons/fa';

interface Milestone {
  id: string;
  skillId: string;
  skillName: string;
  status: 'mastered' | 'developing' | 'emerging';
  lastAssessed: string;
}

interface ProgressCelebrationProps {
  childId: string;
  childName: string;
  recentMilestones: Milestone[];
  showProgressLinks?: boolean;
}

const ProgressCelebration: FC<ProgressCelebrationProps> = ({
  childId,
  childName,
  recentMilestones,
  showProgressLinks = true
}) => {
  const sortedMilestones = [...recentMilestones].sort((a, b) => {
    const statusOrder = { mastered: 3, developing: 2, emerging: 1 };
    return statusOrder[b.status] - statusOrder[a.status];
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mastered':
        return <FaStar className="text-yellow-400 inline-block" />;
      case 'developing':
        return <FaArrowUp className="text-blue-500 inline-block" />;
      case 'emerging':
        return <FaSeedling className="text-green-500 inline-block" />;
      default:
        return null;
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
            {getStatusIcon(mostSignificantMilestone.status)}
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