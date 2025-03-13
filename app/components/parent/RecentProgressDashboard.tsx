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

interface RecentProgressDashboardProps {
  children: Child[];
  selectedChildId?: string | null;
  limit?: number;
  onViewDetails?: (progressId: string, childId: string) => void;
}

export default function RecentProgressDashboard({
  children,
  selectedChildId = null,
  limit = 5,
  onViewDetails
}: RecentProgressDashboardProps) {
  const [recentProgress, setRecentProgress] = useState<ProgressRecord[]>([]);
  const [recentSkills, setRecentSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch recent progress records
  useEffect(() => {
    if (children.length === 0) {
      setLoading(false);
      return;
    }
    
    async function fetchRecentProgress() {
      try {
        setLoading(true);
        
        // Create a map of child IDs to names for easy lookup
        const childIdToName: Record<string, string> = {};
        children.forEach(child => {
          childIdToName[child.id] = child.name;
        });
        
        // Create a filter for the children
        const childIds = selectedChildId 
          ? [selectedChildId] 
          : children.map(child => child.id);
        
        // Progress records query (completed activities and observations)
        const progressQuery = query(
          collection(db, 'progressRecords'),
          where('childId', 'in', childIds),
          where('completionStatus', '==', 'completed'),
          orderBy('date', 'desc'),
          firestoreLimit(limit)
        );
        
        const progressSnapshot = await getDocs(progressQuery);
        const progressData: ProgressRecord[] = [];
        
        progressSnapshot.forEach(doc => {
          const data = doc.data() as Omit<ProgressRecord, 'id'>;
          progressData.push({
            id: doc.id,
            ...data,
            childName: childIdToName[data.childId]
          } as ProgressRecord);
        });
        
        // Get activity titles for each progress record
        const activityLookup: Record<string, string> = {};
        const activityPromises = progressData
          .filter(record => record.activityId && !activityLookup[record.activityId])
          .map(async record => {
            try {
              const activityRef = collection(db, 'activities');
              const activitySnapshot = await getDocs(
                query(activityRef, where('__name__', '==', record.activityId))
              );
              if (!activitySnapshot.empty) {
                const activityData = activitySnapshot.docs[0].data();
                activityLookup[record.activityId] = activityData.title || 'Unnamed Activity';
              }
            } catch (err) {
              console.error(`Error fetching activity ${record.activityId}:`, err);
            }
          });
        
        await Promise.all(activityPromises);
        
        // Add activity titles to progress records
        progressData.forEach(record => {
          if (record.activityId && activityLookup[record.activityId]) {
            record.activityTitle = activityLookup[record.activityId];
          }
        });
        
        setRecentProgress(progressData);
        
        // Skills query (emerging, developing, mastered skills)
        const skillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', 'in', childIds),
          where('status', 'in', ['emerging', 'developing', 'mastered']),
          orderBy('lastAssessed', 'desc'),
          firestoreLimit(limit)
        );
        
        const skillsSnapshot = await getDocs(skillsQuery);
        const skillsData = skillsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          childName: childIdToName[(doc.data() as any).childId]
        }));
        
        setRecentSkills(skillsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching recent progress:', err);
        setError('Failed to load recent progress');
        setLoading(false);
      }
    }
    
    fetchRecentProgress();
  }, [children, selectedChildId, limit]);
  
  // Format date for display
  const formatDate = (date: Timestamp | Date | undefined): string => {
    if (!date) return '';
    
    const dateObj = date instanceof Date 
      ? date 
      : date instanceof Timestamp 
        ? date.toDate() 
        : new Date();
        
    return format(dateObj, 'MMM d');
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
  
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Award className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">Recent Progress</h2>
        </div>
        <Link
          href="/dashboard/progress"
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center"
        >
          View All
          <ArrowUpRight className="h-3 w-3 ml-1" />
        </Link>
      </div>
      
      <div className="p-4">
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
                          {record.childName}
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
            {!selectedChildId && children.length > 1 && (
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
                        {skill.childName}
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