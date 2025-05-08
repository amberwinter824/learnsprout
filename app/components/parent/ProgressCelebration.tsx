import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaStar, FaArrowUp, FaSeedling, FaChevronRight } from 'react-icons/fa';
import { Flower2, Sprout, Leaf, CircleDot, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
  const [enrichedMilestones, setEnrichedMilestones] = useState<Milestone[]>(recentMilestones);
  const pathname = usePathname();
  const isOnProgressPage = pathname === `/dashboard/children/${childId}/development`;

  useEffect(() => {
    async function enrichSkillNames() {
      // Find milestones missing skillName
      const missing = recentMilestones.filter(m => !m.skillName || m.skillName === 'unnamed skill' || m.skillName === 'Skill');
      if (missing.length === 0) {
        setEnrichedMilestones(recentMilestones);
        return;
      }
      const skillIds = Array.from(new Set(missing.map(m => m.skillId)));
      if (skillIds.length === 0) {
        setEnrichedMilestones(recentMilestones);
        return;
      }
      try {
        // Firestore only allows up to 10 in 'in' queries
        const batches = [];
        for (let i = 0; i < skillIds.length; i += 10) {
          batches.push(skillIds.slice(i, i + 10));
        }
        let skillNames: Record<string, string> = {};
        for (const batch of batches) {
          const q = query(collection(db, 'developmentalSkills'), where('__name__', 'in', batch));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            skillNames[doc.id] = doc.data().name || 'Skill';
          });
        }
        // Enrich milestones
        setEnrichedMilestones(recentMilestones.map(m => ({
          ...m,
          skillName: m.skillName && m.skillName !== 'unnamed skill' && m.skillName !== 'Skill' ? m.skillName : (skillNames[m.skillId] || 'Skill')
        })));
      } catch (err) {
        setEnrichedMilestones(recentMilestones);
      }
    }
    enrichSkillNames();
  }, [recentMilestones]);

  const sortedMilestones = [...enrichedMilestones].sort((a, b) => {
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

  const statusCounts = enrichedMilestones.reduce((acc, milestone) => {
    acc[milestone.status] = (acc[milestone.status] || 0) + 1;
    return acc;
  }, { mastered: 0, developing: 0, emerging: 0, not_started: 0 } as Record<SkillStatus, number>);

  const totalMilestones = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  if (!enrichedMilestones.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center mb-3">
          <h3 className="text-sm font-medium text-gray-900">{childName}</h3>
        </div>
        <p className="text-gray-600 mb-2">
          Ready to start tracking {childName}'s development journey!
        </p>
        {showProgressLinks && (
          <div className="mt-4">
            <Link
              href={`/dashboard/children/${childId}/assessment`}
              className="text-emerald-600 hover:text-emerald-700 font-medium mr-6"
            >
              Start Development Assessment
            </Link>
          </div>
        )}
      </div>
    );
  }

  const developingSkills = sortedMilestones.filter(m => m.status === 'developing');
  const masteredSkills = sortedMilestones.filter(m => m.status === 'mastered');

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

      {/* Progress Summary */}
      {developingSkills.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            {childName} is currently working on {developingSkills.length} skill{developingSkills.length > 1 ? 's' : ''}:
          </p>
          <div className="space-y-3">
            {developingSkills.map((milestone) => (
              <div key={milestone.id} className="relative">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: '60%' }} />
                </div>
                <div className="mt-1.5 flex items-start justify-between">
                  <div className="flex-1 flex items-center">
                    <div className="mr-2 text-blue-500">
                      <Sprout className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {milestone.skillName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last assessed {format(new Date(milestone.lastAssessed), 'MMM d')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Achievements */}
      {masteredSkills.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-600 mb-2">
            Recent achievements:
          </p>
          <div className="space-y-2">
            {masteredSkills.map((milestone) => (
              <div key={milestone.id} className="flex items-center">
                <div className="mr-2 text-emerald-500">
                  <Flower2 className="h-4 w-4" />
                </div>
                <p className="text-xs text-gray-900">
                  {milestone.skillName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressCelebration; 