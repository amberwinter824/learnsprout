// app/components/parent/RecentProgressDashboard.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit as firestoreLimit, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  BarChart2, 
  Award, 
  Star, 
  Calendar, 
  Loader2, 
  Camera,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  ageGroup?: string;
  [key: string]: any;
}

interface ProgressRecord {
  id: string;
  childId: string;
  childName?: string;
  activityId: string;
  activityTitle?: string;
  date: Timestamp | Date;
  skillsDemonstrated?: string[];
  skillsProgress?: Record<string, string>;
  notes?: string;
  engagementLevel?: 'low' | 'medium' | 'high';
  completionStatus?: 'started' | 'in_progress' | 'completed';
  photoUrls?: string[];
  [key: string]: any;
}

interface ChildSkill {
  id: string;
  childId: string;
  skillName: string;
  status: string;
  lastAssessed?: Timestamp | Date;
  area: string;
  [key: string]: any;
}

interface RecentProgressDashboardProps {
  childrenData: Child[];
  selectedChildId?: string | null;
  limit?: number;
  onViewDetails?: (progressId: string, childId: string) => void;
}

export default function RecentProgressDashboard({
  childrenData = [],
  selectedChildId = null,
  limit = 5,
  onViewDetails
}: RecentProgressDashboardProps) {
  const [recentProgress, setRecentProgress] = useState<ProgressRecord[]>([]);
  const [recentSkills, setRecentSkills] = useState<ChildSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [developmentSpotlight, setDevelopmentSpotlight] = useState<{
    area: string;
    description: string;
    skills: ChildSkill[];
  } | null>(null);
  
  // Fetch recent progress records
  useEffect(() => {
    // Ensure childrenData is an array and has items
    if (!Array.isArray(childrenData) || childrenData.length === 0) {
      setLoading(false);
      return;
    }
    
    async function fetchRecentProgress() {
      try {
        setLoading(true);
        
        // Create a map of child IDs to names for easy lookup
        const childIdToName: Record<string, string> = {};
        const childIds = childrenData.map(child => {
          childIdToName[child.id] = child.name;
          return child.id;
        });
        
        // First, fetch all developmental skills to use as a reference
        const devSkillsQuery = query(collection(db, 'developmentalSkills'));
        const devSkillsSnapshot = await getDocs(devSkillsQuery);
        const devSkillsMap = new Map();
        
        devSkillsSnapshot.forEach(doc => {
          devSkillsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
        
        // Then fetch child skills
        const skillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', 'in', childIds),
          where('status', 'in', ['emerging', 'developing', 'mastered']),
          orderBy('lastAssessed', 'desc'),
          firestoreLimit(limit)
        );
        
        const skillsSnapshot = await getDocs(skillsQuery);
        const skillsData = skillsSnapshot.docs.map(doc => {
          const data = doc.data();
          const devSkill = devSkillsMap.get(data.skillId);
          return {
            id: doc.id,
            childId: data.childId,
            skillId: data.skillId,
            skillName: devSkill?.name || 'Unnamed Skill',
            status: data.status || 'not_started',
            area: devSkill?.area || 'unknown',
            lastAssessed: data.lastAssessed,
            childName: data.childId && childIdToName[data.childId] ? 
              childIdToName[data.childId] : 'Unknown Child'
          } as ChildSkill;
        });
        
        setRecentSkills(skillsData);

        // Calculate development spotlight
        const skillsByArea = skillsData.reduce((acc, skill) => {
          if (!acc[skill.area]) {
            acc[skill.area] = [];
          }
          acc[skill.area].push(skill);
          return acc;
        }, {} as Record<string, ChildSkill[]>);

        // Find area with most developing/emerging skills
        let spotlightArea = '';
        let maxSkills = 0;
        Object.entries(skillsByArea).forEach(([area, skills]) => {
          const activeSkills = skills.filter(s => 
            s.status === 'developing' || s.status === 'emerging'
          ).length;
          if (activeSkills > maxSkills) {
            maxSkills = activeSkills;
            spotlightArea = area;
          }
        });

        if (spotlightArea) {
          setDevelopmentSpotlight({
            area: spotlightArea,
            description: getDevelopmentAreaDescription(spotlightArea),
            skills: skillsByArea[spotlightArea]
              .filter(s => s.status === 'developing' || s.status === 'emerging')
              .slice(0, 3)
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching recent progress:', err);
        setError('Failed to load recent progress');
        setLoading(false);
      }
    }
    
    fetchRecentProgress();
  }, [childrenData, selectedChildId, limit]);
  
  // Format date for display
  const formatDate = (date: Timestamp | Date | undefined): string => {
    if (!date) return '';
    
    try {
      const dateObj = date instanceof Date 
        ? date 
        : date instanceof Timestamp 
          ? date.toDate() 
          : new Date();
          
      return format(dateObj, 'MMM d');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  
  // Get color for engagement level
  const getEngagementColor = (level?: 'low' | 'medium' | 'high'): string => {
    switch (level) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  // Get color for skill status
  const getSkillStatusColor = (status?: string): string => {
    switch (status) {
      case 'mastered': return 'bg-green-500';
      case 'developing': return 'bg-amber-500';
      case 'emerging': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };
  
  // Convert to capitalize words
  const formatStatus = (status?: string): string => {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Helper function to get development area descriptions
  const getDevelopmentAreaDescription = (area: string): string => {
    const descriptions: Record<string, string> = {
      'cognitive': 'Cognitive development includes thinking, problem-solving, and understanding concepts. These skills form the foundation for academic learning.',
      'physical': 'Physical development encompasses both gross and fine motor skills, coordination, and body awareness. These skills are essential for daily activities and self-care.',
      'social_emotional': 'Social-emotional development includes self-awareness, managing emotions, and building relationships. These skills are crucial for healthy social interactions.',
      'language': 'Language development involves communication, vocabulary, and understanding. These skills are fundamental for expressing needs and learning.',
      'adaptive': 'Adaptive development includes self-care skills and daily living activities. These skills help children become more independent.',
      'sensory': 'Sensory development involves processing and responding to different sensory inputs. These skills help children understand and interact with their environment.',
      'play': 'Play development includes imagination, creativity, and social play. These skills support learning and social interaction.'
    };
    return descriptions[area] || 'This developmental area is important for your child\'s growth.';
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>{error}</p>
      </div>
    );
  }
  
  // If no children data, show a message
  if (!Array.isArray(childrenData) || childrenData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <Award className="h-5 w-5 text-emerald-500 mr-2" />
            <h2 className="text-lg font-medium">Recent Progress</h2>
          </div>
        </div>
        <div className="p-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-500">No children added yet. Add a child to track progress.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Award className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">Recent Progress</h2>
        </div>
        <Link
          href="/dashboard/development"
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center"
        >
          View All
          <ArrowUpRight className="h-3 w-3 ml-1" />
        </Link>
      </div>
      
      <div className="p-4">
        {/* Development Spotlight */}
        {developmentSpotlight && (
          <div className="mb-6 bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <h3 className="text-sm font-medium text-emerald-800 mb-2">
              Development Spotlight: {developmentSpotlight.area.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </h3>
            <p className="text-sm text-emerald-700 mb-3">
              {developmentSpotlight.description}
            </p>
            <div className="space-y-2">
              {developmentSpotlight.skills.map(skill => (
                <div key={skill.id} className="flex items-center text-sm">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    skill.status === 'developing' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-emerald-800">
                    {skill.skillName || skill.name || 'Skill'} - {skill.status.charAt(0).toUpperCase() + skill.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentProgress.length > 0 ? (
          <div className="space-y-5">
            <h3 className="text-sm font-medium text-gray-500">Completed Activities</h3>
            <div className="space-y-3">
              {recentProgress.map(record => (
                <div 
                  key={record.id} 
                  className="border border-green-200 bg-green-50 rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => onViewDetails && onViewDetails(record.id, record.childId)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{record.activityTitle || 'Activity'}</h4>
                      <div className="flex items-center mt-1">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {record.childName || 'Unknown Child'}
                        </span>
                        <span className="text-xs text-gray-500 ml-2 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(record.date)}
                        </span>
                      </div>
                    </div>
                    
                    {record.engagementLevel && (
                      <div className="flex items-center">
                        <span className={`flex items-center ${getEngagementColor(record.engagementLevel)}`}>
                          {record.engagementLevel === 'high' && <Star className="h-4 w-4" />}
                          <span className="text-xs ml-1 capitalize">{record.engagementLevel}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {record.notes && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{record.notes}</p>
                  )}
                  
                  <div className="flex items-center mt-2">
                    {record.photoUrls && record.photoUrls.length > 0 && (
                      <span className="text-xs text-gray-500 flex items-center mr-3">
                        <Camera className="h-3 w-3 mr-1" />
                        {record.photoUrls.length} photo{record.photoUrls.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    
                    {record.skillsDemonstrated && record.skillsDemonstrated.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {record.skillsDemonstrated.length} skill{record.skillsDemonstrated.length !== 1 ? 's' : ''} demonstrated
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-500">No recent activity progress recorded.</p>
            {!selectedChildId && childrenData.length > 1 && (
              <p className="text-sm text-gray-500 mt-2">Try selecting a specific child to see their progress.</p>
            )}
          </div>
        )}
        
        {recentSkills.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Skill Development</h3>
            <div className="space-y-3">
              {recentSkills.map(skill => (
                <div key={skill.id} className="flex items-center p-3 border rounded-lg">
                  <div className={`w-3 h-3 rounded-full mr-3 ${getSkillStatusColor(skill.status)}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{skill.skillName || skill.name || 'Skill'}</h4>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {skill.childName || 'Unknown Child'}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-600 capitalize font-medium">
                        {formatStatus(skill.status)}
                      </span>
                      {skill.lastAssessed && (
                        <span className="text-xs text-gray-500 ml-2 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(skill.lastAssessed)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}