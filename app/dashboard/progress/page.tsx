"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Award, 
  BarChart2,
  Book,
  Loader2,
  Calendar,
  ArrowUpRight,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import ProgressCelebration from '@/components/parent/ProgressCelebration';

// Define interfaces
interface Child {
  id: string;
  name: string;
  birthDate?: any;
  ageGroup?: string;
  interests?: string[];
  active?: boolean;
}

interface ProgressRecord {
  id: string;
  childId: string;
  activityId: string;
  activityTitle?: string;
  completionStatus: string;
  date: Timestamp;
  engagementLevel?: string;
  notes?: string;
  skillsDemonstrated?: string[];
}

interface ChildSkill {
  id: string;
  childId: string;
  skillId: string;
  skillName?: string;
  status: 'not_started' | 'emerging' | 'developing' | 'mastered';
  lastAssessed?: Timestamp;
}

interface ProgressSummary {
  childId: string;
  childName: string;
  totalActivities: number;
  completedActivities: number;
  recentActivities: number;
  totalSkills: number;
  inProgressSkills: number;
  masteredSkills: number;
  lastActivity?: Timestamp;
}

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="bg-red-50 p-4 rounded-lg text-red-800 max-w-3xl mx-auto">
      <div className="flex">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-medium">Error loading progress data</h3>
          <p className="mt-1">{error.message}</p>
          <button
            onClick={resetErrorBoundary}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DevelopmentDashboardPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [progressSummaries, setProgressSummaries] = useState<ProgressSummary[]>([]);
  const [recentProgress, setRecentProgress] = useState<ProgressRecord[]>([]);
  const [recentSkills, setRecentSkills] = useState<ChildSkill[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch all data
  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      console.error('No user ID available');
      setLoading(false);
      return;
    }
    
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch all children for the current user
        console.log('Attempting to fetch children with user ID:', currentUser?.uid);
        
        // Create queries for both userId and parentId
        const userIdQuery = query(
          collection(db, 'children'),
          where('userId', '==', currentUser?.uid)
        );
        
        const parentIdQuery = query(
          collection(db, 'children'),
          where('parentId', '==', currentUser?.uid)
        );
        
        // Execute both queries
        const [userIdSnapshot, parentIdSnapshot] = await Promise.all([
          getDocs(userIdQuery),
          getDocs(parentIdQuery)
        ]);
        
        // Combine and deduplicate results
        const childrenData: Child[] = [];
        const seenIds = new Set();
        
        // Process results from both queries
        [userIdSnapshot, parentIdSnapshot].forEach(snapshot => {
          snapshot.forEach(doc => {
            const data = doc.data();
            // Include if active is true or undefined
            if (!seenIds.has(doc.id) && (data.active === undefined || data.active === true)) {
              seenIds.add(doc.id);
              childrenData.push({ id: doc.id, ...data } as Child);
            }
          });
        });
        
        console.log('Found children:', childrenData.length);
        console.log('Children data:', childrenData);
        
        setChildren(childrenData);
        
        if (childrenData.length === 0) {
          setLoading(false);
          return;
        }
        
        // Create a map for quick child name lookup
        const childNameMap: Record<string, string> = {};
        childrenData.forEach(child => {
          childNameMap[child.id] = child.name;
        });
        
        // Get child IDs for queries
        const childIds = childrenData.map(child => child.id);
        
        // Fetch recent progress records
        const progressQuery = query(
          collection(db, 'progressRecords'),
          where('childId', 'in', childIds),
          orderBy('date', 'desc'),
          limit(10)
        );
        
        const progressSnapshot = await getDocs(progressQuery);
        const progressData: ProgressRecord[] = [];
        
        progressSnapshot.forEach(doc => {
          const data = doc.data() as Omit<ProgressRecord, 'id'>;
          progressData.push({
            id: doc.id,
            ...data,
            childId: data.childId,
            activityId: data.activityId,
            completionStatus: data.completionStatus,
            date: data.date,
          });
        });
        
        // Fetch activity titles one by one to avoid the 'in' query issue
        const activityTitles: Record<string, string> = {};
        
        for (const record of progressData) {
          if (!record.activityId || activityTitles[record.activityId]) continue;
          
          try {
            const activityDoc = await getDoc(doc(db, 'activities', record.activityId));
            if (activityDoc.exists()) {
              activityTitles[record.activityId] = activityDoc.data().title || 'Unknown Activity';
            }
          } catch (err) {
            console.error(`Error fetching activity ${record.activityId}:`, err);
            activityTitles[record.activityId] = 'Unknown Activity';
          }
        }
        
        // Enrich progress data with activity titles
        const progressWithTitles = progressData.map(record => ({
          ...record,
          activityTitle: activityTitles[record.activityId] || 'Unknown Activity'
        }));
        
        setRecentProgress(progressWithTitles);
        
        // Fetch recent skill updates
        const skillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', 'in', childIds),
          where('status', 'in', ['mastered', 'developing', 'emerging']),
          orderBy('lastAssessed', 'desc'),
          limit(10)
        );

        let skillsData: ChildSkill[] = [];
        try {
          const skillsSnapshot = await getDocs(skillsQuery);
          skillsData = skillsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            childId: doc.data().childId,
            skillId: doc.data().skillId,
            status: doc.data().status,
            lastAssessed: doc.data().lastAssessed
          }));
        } catch (error) {
          console.error('Error fetching skills:', error);
          // Continue with empty skills data
        }

        // Fetch skill names all at once
        const skillIds = Array.from(new Set(skillsData.map(s => s.skillId))).filter(Boolean);
        const skillNames: Record<string, string> = {};

        if (skillIds.length > 0) {
          try {
            // Fetch all skills in one query if possible
            const skillNamesQuery = query(
              collection(db, 'developmentalSkills'),
              where('__name__', 'in', skillIds)
            );
            
            try {
              const skillNamesSnapshot = await getDocs(skillNamesQuery);
              skillNamesSnapshot.forEach(doc => {
                skillNames[doc.id] = doc.data().name || 'Unknown Skill';
              });
            } catch (error) {
              console.error('Error fetching skill names:', error);
              // Set default names if query fails
              skillIds.forEach(skillId => {
                if (skillId) skillNames[skillId] = 'Unknown Skill';
              });
            }
          } catch (error) {
            console.error('Error with skill names query:', error);
            // Set default names
            skillIds.forEach(skillId => {
              if (skillId) skillNames[skillId] = 'Unknown Skill';
            });
          }
        }

        // Enrich skills data with names
        const skillsWithNames = skillsData.map(skill => ({
          ...skill,
          skillName: skill.skillId && skillNames[skill.skillId] ? skillNames[skill.skillId] : 'Unknown Skill'
        }));

        setRecentSkills(skillsWithNames);
        
        // Calculate progress summaries for each child
        const summaries: ProgressSummary[] = [];
        
        // Fetch all progress records in one query
        const allProgressQuery = query(
          collection(db, 'progressRecords'),
          where('childId', 'in', childIds)
        );
        
        const allProgressSnapshot = await getDocs(allProgressQuery);
        const allProgress: Record<string, ProgressRecord[]> = {};
        
        // Initialize arrays for each child
        childIds.forEach(id => {
          allProgress[id] = [];
        });
        
        // Group progress records by child
        allProgressSnapshot.forEach(doc => {
          const data = doc.data() as Omit<ProgressRecord, 'id'>;
          if (data.childId && allProgress[data.childId]) {
            allProgress[data.childId].push({
              id: doc.id,
              childId: data.childId,
              activityId: data.activityId,
              activityTitle: data.activityTitle,
              completionStatus: data.completionStatus,
              date: data.date,
              engagementLevel: data.engagementLevel,
              notes: data.notes,
              skillsDemonstrated: data.skillsDemonstrated
            });
          }
        });
        
        // Fetch all skills in one query
        const allSkillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', 'in', childIds)
        );
        
        const allSkillsSnapshot = await getDocs(allSkillsQuery);
        const allSkills: Record<string, ChildSkill[]> = {};
        
        // Initialize arrays for each child
        childIds.forEach(id => {
          allSkills[id] = [];
        });
        
        // Group skills by child
        allSkillsSnapshot.forEach(doc => {
          const data = doc.data() as Omit<ChildSkill, 'id'>;
          if (data.childId && allSkills[data.childId]) {
            allSkills[data.childId].push({
              id: doc.id,
              childId: data.childId,
              skillId: data.skillId,
              skillName: data.skillName,
              status: data.status,
              lastAssessed: data.lastAssessed
            });
          }
        });
        
        // Calculate summaries for each child
        for (const child of childrenData) {
          const childProgress = allProgress[child.id] || [];
          const childSkills = allSkills[child.id] || [];
          
          // Calculate summary statistics
          const totalActivities = childProgress.length;
          const completedActivities = childProgress.filter(p => p.completionStatus === 'completed').length;
          
          // Recent activities (last 30 days)
          const oneMonthAgo = subMonths(new Date(), 1);
          const recentActivities = childProgress.filter(p => {
            const recordDate = p.date.toDate();
            return recordDate >= oneMonthAgo;
          }).length;
          
          // Calculate skill statistics
          const totalSkills = childSkills.length;
          const inProgressSkills = childSkills.filter(s => s.status === 'emerging' || s.status === 'developing').length;
          const masteredSkills = childSkills.filter(s => s.status === 'mastered').length;
          
          // Find last activity date
          let lastActivity: Timestamp | undefined;
          if (childProgress.length > 0) {
            lastActivity = childProgress.sort((a, b) => b.date.seconds - a.date.seconds)[0].date;
          }
          
          summaries.push({
            childId: child.id,
            childName: child.name,
            totalActivities,
            completedActivities,
            recentActivities,
            totalSkills,
            inProgressSkills,
            masteredSkills,
            lastActivity
          });
        }
        
        setProgressSummaries(summaries);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching progress data:', err);
        setError(`Error loading progress data: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    }
    
    fetchData();
  }, [currentUser, refreshing]);
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    
    // Reset after a short delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };
  
  // Format date for display
  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = timestamp.toDate();
    return format(date, 'MMM d, yyyy');
  };
  
  // Get relative time for display
  const getRelativeTime = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };
  
  // Get color for completion status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
        return 'bg-green-100 text-green-800';
      case 'in_progress': 
        return 'bg-blue-100 text-blue-800';
      case 'started': 
        return 'bg-yellow-100 text-yellow-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get color for skill status
  const getSkillStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': 
        return 'bg-green-100 text-green-800';
      case 'developing': 
        return 'bg-blue-100 text-blue-800';
      case 'emerging': 
        return 'bg-yellow-100 text-yellow-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-800 max-w-3xl mx-auto">
        <div className="flex">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium">Error loading progress data</h3>
            <p className="mt-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (children.length === 0) {
    return (
      <div className="py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Progress Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Track your children's development and learning journey</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900">No Children Added Yet</h2>
          <p className="text-gray-500 max-w-md mx-auto mt-2 mb-6">
            Add a child profile to start tracking developmental progress and learning activities.
          </p>
          <Link
            href="/dashboard/children/add"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
          >
            Add Child Profile
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Developmental Domains Overview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Understanding Progress Tracking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Core Areas</h3>
              <p className="text-sm text-blue-700">
                We track progress across key developmental domains: Practical Life, Sensorial, Language, Mathematics, Cultural, and Social & Emotional development.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-2">Skill Progression</h3>
              <p className="text-sm text-purple-700">
                Skills are tracked through stages: Emerging (initial interest), Developing (growing competence), and Mastered (consistent performance).
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Activity Engagement</h3>
              <p className="text-sm text-green-700">
                Activities are designed to support multiple developmental areas simultaneously, creating an integrated learning experience.
              </p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>For detailed progress tracking and skill development information, visit your child's individual progress page.</p>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Development Overview</h1>
              <p className="mt-1 text-sm text-gray-500">Track your children's development and learning journey</p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {/* Child Selection Filter */}
          {children.length > 1 && (
            <div className="mb-6 bg-white shadow-sm rounded-lg p-4">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2">Filter by child:</span>
                <button
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    selectedChild === null
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedChild(null)}
                >
                  All Children
                </button>
                
                {children.map(child => (
                  <button
                    key={child.id}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      selectedChild === child.id
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedChild(child.id)}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Progress Summary Cards */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Progress Summary</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {progressSummaries
                .filter(summary => selectedChild === null || summary.childId === selectedChild)
                .map(summary => {
                  // Find the child data
                  const child = children.find(c => c.id === summary.childId);
                  
                  // Find recent milestones for this child
                  const childSkills = recentSkills
                    .filter(skill => skill.childId === summary.childId)
                    .map(skill => ({
                      id: skill.id,
                      skillId: skill.skillId,
                      skillName: skill.skillName || 'Skill',
                      status: skill.status as 'mastered' | 'developing' | 'emerging',
                      lastAssessed: skill.lastAssessed ? skill.lastAssessed.toDate().toISOString() : new Date().toISOString()
                    }))
                    .sort((a, b) => new Date(b.lastAssessed).getTime() - new Date(a.lastAssessed).getTime())
                    .slice(0, 5);
                    
                  return (
                    <ProgressCelebration
                      key={summary.childId}
                      childId={summary.childId}
                      childName={summary.childName}
                      recentMilestones={childSkills}
                    />
                  );
                })}
            </div>
          </div>
          
          {/* Recent Activities */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Activities</h2>
            </div>
            
            <div className="p-6">
              {recentProgress.length > 0 ? (
                <div className="space-y-4">
                  {recentProgress
                    .filter(record => selectedChild === null || record.childId === selectedChild)
                    .slice(0, 3) // Show fewer items for less overwhelm
                    .map(record => (
                      <div key={record.id} className="flex items-start p-4 bg-gray-50 rounded-lg">
                        <div className={`flex-shrink-0 w-2 h-2 mt-1.5 mr-2 rounded-full ${
                          record.completionStatus === 'completed' ? 'bg-green-500' :
                          record.completionStatus === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`} />
                        <div className="flex-grow">
                          <h3 className="font-medium text-gray-900">{record.activityTitle || 'Activity'}</h3>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <span className="font-medium text-blue-700 mr-2">
                              {children.find(c => c.id === record.childId)?.name}
                            </span>
                            <span>{formatDate(record.date)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No recent activities found</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Recent Skill Progress */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Skill Development</h2>
            </div>
            
            <div className="px-4 py-5 sm:p-6">
              {recentSkills.length > 0 ? (
                <div className="space-y-4">
                  {recentSkills
                    .filter(skill => selectedChild === null || skill.childId === selectedChild)
                    .slice(0, 5)
                    .map(skill => (
                      <div key={skill.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between">
                          <h3 className="font-medium text-gray-900">{skill.skillName || 'Skill'}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getSkillStatusColor(skill.status)}`}>
                            {skill.status.charAt(0).toUpperCase() + skill.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="mt-1 flex items-center">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {children.find(c => c.id === skill.childId)?.name || 'Unknown Child'}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(skill.lastAssessed)}
                          </span>
                        </div>
                        
                        <Link 
                          href={`/dashboard/children/${skill.childId}/progress`}
                          className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 inline-block"
                        >
                          View skill progress
                        </Link>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No skill progress recorded yet</p>
                  <p className="text-sm text-gray-500 mt-2">Complete activities to develop new skills</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}