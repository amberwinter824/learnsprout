"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format, subMonths, startOfWeek as dateStartOfWeek } from 'date-fns';
import { collection, query, where, getDocs, getDoc, doc, Timestamp, orderBy, limit, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  BarChart2, 
  Calendar, 
  Clock,
  Edit,
  PlusCircle,
  BookOpen,
  User,
  CheckCircle2,
  Clock4,
  Heart,
  Star,
  Award,
  MessageCircle,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Play,
  Package,
  Users,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AllChildrenMaterialsForecast from '@/app/components/parent/AllChildrenMaterialsForecast';
import WeeklyPlanWithDayFocus from '@/app/components/parent/WeeklyPlanWithDayFocus';
import { generateWeeklyPlan } from '@/lib/planGenerator';
import { updateUserMaterial } from '@/lib/materialsService';

// Define interfaces
interface Child {
  id: string;
  name: string;
  birthDate?: any;
  ageGroup?: string;
  interests?: string[];
  notes?: string;
  active?: boolean;
  familyId: string;
}

interface ActivityRecord {
  id: string;
  activityId: string;
  activityTitle?: string;
  date: Timestamp;
  completionStatus: 'started' | 'in_progress' | 'completed';
  engagementLevel?: 'low' | 'medium' | 'high';
  notes?: string;
  skillsDemonstrated?: string[];
  photoUrls?: string[];
}

interface DailyActivity {
  id: string;
  activityId: string;
  activityTitle?: string;
  description?: string;
  plannedFor: Timestamp;
  completed?: boolean;
  duration?: number;
  area?: string;
}

interface SkillSummary {
  area: string;
  areaLabel: string;
  mastered: number;
  developing: number;
  emerging: number;
  notStarted: number;
  total: number;
}

export default function ChildProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const childId = params.id;
  
  // Get the showAddRecord parameter from URL
  const showAddRecord = searchParams.get('showAddRecord') === 'true';
  const recordId = searchParams.get('record');
  
  // State
  const [child, setChild] = useState<Child | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityRecord[]>([]);
  const [weeklyActivities, setWeeklyActivities] = useState<DailyActivity[]>([]);
  const [activityStats, setActivityStats] = useState({ total: 0, completed: 0, recent: 0 });
  const [skillsStats, setSkillsStats] = useState<SkillSummary[]>([]);
  const [recommendedActivities, setRecommendedActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const materialsForecastRef = useRef<{ fetchMaterialsNeeded: () => void }>(null);
  
  // Fetch child data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Check if user is authenticated
        if (!currentUser) {
          setError('You must be logged in to view this page');
          setLoading(false);
          return;
        }
        
        // Fetch child data
        const childDoc = await getDoc(doc(db, 'children', childId));
        console.log('Child doc exists:', childDoc.exists());
        if (childDoc.exists()) {
          console.log('Child data:', childDoc.data());
          setChild({ id: childDoc.id, ...childDoc.data() } as Child);
        } else {
          setError('Child not found');
        }
        
        // Fetch recent activities
        const activitiesQuery = query(
          collection(db, 'progressRecords'),
          where('childId', '==', childId),
          orderBy('date', 'desc'),
          limit(5)
        );
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activitiesData: ActivityRecord[] = [];
        
        activitiesSnapshot.forEach(doc => {
          activitiesData.push({ id: doc.id, ...doc.data() } as ActivityRecord);
        });
        
        // Fetch activity titles
        const activityIds = Array.from(new Set(activitiesData.map(a => a.activityId)));
        const activityTitles: Record<string, string> = {};
        
        if (activityIds.length > 0) {
          // Firestore queries can only use 'in' with a maximum of 10 items
          const batchedIds = activityIds.slice(0, 10);
          const activityQuery = query(
            collection(db, 'activities'),
            where(documentId(), 'in', batchedIds)
          );
          
          const activitySnapshot = await getDocs(activityQuery);
          activitySnapshot.forEach(doc => {
            activityTitles[doc.id] = doc.data().title || 'Unknown Activity';
          });
        }
        
        // Add activity titles to records
        const enrichedActivities = activitiesData.map(activity => ({
          ...activity,
          activityTitle: activityTitles[activity.activityId] || 'Unknown Activity'
        }));
        
        setRecentActivities(enrichedActivities);
        
        // Fetch activity stats
        const allActivitiesQuery = query(
          collection(db, 'progressRecords'),
          where('childId', '==', childId)
        );
        
        const allActivitiesSnapshot = await getDocs(allActivitiesQuery);
        const allActivitiesData: ActivityRecord[] = [];
        
        allActivitiesSnapshot.forEach(doc => {
          allActivitiesData.push({ id: doc.id, ...doc.data() } as ActivityRecord);
        });
        
        const completed = allActivitiesData.filter(a => a.completionStatus === 'completed').length;
        
        // Calculate recent activities (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recent = allActivitiesData.filter(a => {
          let activityDate;
          if (a.date?.toDate) {
            activityDate = a.date.toDate();
          } else if (a.date instanceof Date) {
            activityDate = a.date;
          } else if (typeof a.date === 'string' || typeof a.date === 'number') {
            activityDate = new Date(a.date);
          } else {
            // Default fallback if date is in an unexpected format
            activityDate = new Date(0); // Unix epoch
          }
          return activityDate >= thirtyDaysAgo;
        }).length;
        
        setActivityStats({
          total: allActivitiesData.length,
          completed,
          recent
        });
        
        // Fetch weekly activities
        const today = new Date();
        const startOfWeekDate = dateStartOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday
        const endOfWeekDate = new Date(startOfWeekDate);
        endOfWeekDate.setDate(endOfWeekDate.getDate() + 7);
        
        const startTimestamp = Timestamp.fromDate(startOfWeekDate);
        const endTimestamp = Timestamp.fromDate(endOfWeekDate);
        
        const weeklyQuery = query(
          collection(db, 'plannedActivities'),
          where('childId', '==', childId),
          where('plannedFor', '>=', startTimestamp),
          where('plannedFor', '<', endTimestamp)
        );
        
        const weeklySnapshot = await getDocs(weeklyQuery);
        const weeklyData: DailyActivity[] = [];
        
        weeklySnapshot.forEach(doc => {
          weeklyData.push({ id: doc.id, ...doc.data() } as DailyActivity);
        });
        
        // Fetch activity titles for weekly activities
        const weeklyActivityIds = Array.from(new Set(weeklyData.map(a => a.activityId)));
        const weeklyActivityTitles: Record<string, string> = {};
        
        if (weeklyActivityIds.length > 0) {
          // Handle in batches if needed
          const batchedIds = weeklyActivityIds.slice(0, 10);
          const activityQuery = query(
            collection(db, 'activities'),
            where(documentId(), 'in', batchedIds)
          );
          
          const activitySnapshot = await getDocs(activityQuery);
          activitySnapshot.forEach(doc => {
            weeklyActivityTitles[doc.id] = doc.data().title || 'Unknown Activity';
          });
        }
        
        // Add activity titles to weekly activities
        const enrichedWeeklyActivities = weeklyData.map(activity => ({
          ...activity,
          activityTitle: weeklyActivityTitles[activity.activityId] || 'Unknown Activity'
        }));
        
        setWeeklyActivities(enrichedWeeklyActivities);
        
        // Fetch skills stats
        const skillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', childId)
        );
        
        const skillsSnapshot = await getDocs(skillsQuery);
        const skillsData: {
          id: string;
          area?: string;
          status?: 'not_started' | 'emerging' | 'developing' | 'mastered';
          [key: string]: any;
        }[] = [];
        
        skillsSnapshot.forEach(doc => {
          skillsData.push({ id: doc.id, ...doc.data() });
        });
        
        // Group by area and count statuses
        const areaStats: Record<string, { mastered: number, developing: number, emerging: number, notStarted: number, total: number }> = {};
        
        skillsData.forEach(skill => {
          const area = skill.area || 'unknown';
          
          if (!areaStats[area]) {
            areaStats[area] = { mastered: 0, developing: 0, emerging: 0, notStarted: 0, total: 0 };
          }
          
          areaStats[area].total++;
          
          if (skill.status === 'mastered') {
            areaStats[area].mastered++;
          } else if (skill.status === 'developing') {
            areaStats[area].developing++;
          } else if (skill.status === 'emerging') {
            areaStats[area].emerging++;
          } else {
            areaStats[area].notStarted++;
          }
        });
        
        // Format the area stats
        const formattedStats = Object.entries(areaStats).map(([area, stats]) => ({
          area,
          areaLabel: getAreaLabel(area),
          ...stats
        }));
        
        setSkillsStats(formattedStats);
        
        // Fetch recommended activities
        const recommendedQuery = query(
          collection(db, 'activitySuggestions'),
          where('childId', '==', childId),
          orderBy('priority', 'desc'),
          limit(3)
        );
        
        const recommendedSnapshot = await getDocs(recommendedQuery);
        const recommendedData: {
          id: string;
          activityId: string;
          priority?: number;
          [key: string]: any;
        }[] = [];
        recommendedSnapshot.forEach(doc => {
          const docData = doc.data();
          recommendedData.push({ 
            id: doc.id, 
            activityId: docData.activityId,
            priority: docData.priority,
            ...docData 
          });
        });
        
        // If we have suggestions, fetch the activity details
        if (recommendedData.length > 0) {
          const recommendedIds = recommendedData.map(rec => rec.activityId);
          
          // Fetch the activities
          const activitiesForSuggestions: Record<string, any> = {};
          
          // Handle in batches if needed
          const batchedRecIds = recommendedIds.slice(0, 10);
          const recActivityQuery = query(
            collection(db, 'activities'),
            where(documentId(), 'in', batchedRecIds)
          );
          
          const recActivitySnapshot = await getDocs(recActivityQuery);
          recActivitySnapshot.forEach(doc => {
            activitiesForSuggestions[doc.id] = { id: doc.id, ...doc.data() };
          });
          
          // Merge suggestions with activity details
          const enrichedRecommendations = recommendedData.map(rec => ({
            ...rec,
            activity: activitiesForSuggestions[rec.activityId] || null
          }));
          
          setRecommendedActivities(enrichedRecommendations);
        }
        
        // If record ID is provided, fetch that specific record
        if (recordId) {
          const recordDoc = await getDoc(doc(db, 'progressRecords', recordId));
          if (recordDoc.exists()) {
            const recordData = { id: recordDoc.id, ...recordDoc.data() } as ActivityRecord;
            
            // Fetch activity title if needed
            if (recordData.activityId && !recordData.activityTitle) {
              try {
                const activityDoc = await getDoc(doc(db, 'activities', recordData.activityId));
                if (activityDoc.exists()) {
                  recordData.activityTitle = activityDoc.data().title || 'Unknown Activity';
                }
              } catch (e) {
                console.error('Error fetching activity title for record:', e);
              }
            }
            
            setSelectedActivity(recordData);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching child data:', err);
        
        // More specific error messages
        if (err instanceof Error) {
          if (err.message.includes('permission')) {
            setError('Access denied: You do not have permission to view this data. Please check your account permissions.');
          } else {
            setError(`Error loading child data: ${err.message}`);
          }
        } else {
          setError(`Error loading child data: ${String(err)}`);
        }
        
        setLoading(false);
      }
    }
    
    if (childId) {
      fetchData();
    }
  }, [childId, recordId]);
  
  // Add this at the beginning of your component
  useEffect(() => {
    // Log authentication state for debugging
    console.log('Auth state:', currentUser ? 'Logged in' : 'Not logged in');
    if (currentUser) {
      console.log('User ID:', currentUser.uid);
    }
  }, [currentUser]);
  
  // Helper functions
  const formatDate = (timestamp?: Timestamp | Date) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp instanceof Date 
        ? timestamp 
        : (timestamp as Timestamp).toDate();
      
      return format(date, 'MMM d');
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  };
  
  const formatDateWithYear = (timestamp?: Timestamp | Date) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp instanceof Date 
        ? timestamp 
        : (timestamp as Timestamp).toDate();
      
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  };
  
  const formatAge = (birthDate?: any) => {
    if (!birthDate) return '';
    
    try {
      const birthDateObj = birthDate instanceof Date 
        ? birthDate 
        : birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
      
      const now = new Date();
      const years = now.getFullYear() - birthDateObj.getFullYear();
      const months = now.getMonth() - birthDateObj.getMonth();
      const days = now.getDate() - birthDateObj.getDate();
      
      let formattedAge = '';
      
      if (years > 0) {
        formattedAge = `${years} year${years !== 1 ? 's' : ''}`;
      }
      
      if (months > 0 || (months === 0 && years === 0)) {
        if (formattedAge) formattedAge += ', ';
        formattedAge += `${months < 0 ? months + 12 : months} month${months !== 1 ? 's' : ''}`;
      }
      
      if (years === 0 && months === 0) {
        formattedAge = `${days < 0 ? days + 30 : days} day${days !== 1 ? 's' : ''}`;
      }
      
      return formattedAge;
    } catch (e) {
      console.error('Error formatting age:', e);
      return '';
    }
  };
  
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
  
  const getAreaLabel = (area: string) => {
    const areaMap: Record<string, string> = {
      'practical_life': 'Practical Life',
      'sensorial': 'Sensorial',
      'language': 'Language',
      'mathematics': 'Mathematics',
      'cultural': 'Cultural',
      'social_emotional': 'Social & Emotional',
      'physical': 'Physical'
    };
    
    return areaMap[area] || area;
  };
  
  const getAreaColor = (area: string) => {
    const areaColorMap: Record<string, string> = {
      'practical_life': 'bg-blue-100 text-blue-800',
      'sensorial': 'bg-purple-100 text-purple-800',
      'language': 'bg-green-100 text-green-800',
      'mathematics': 'bg-red-100 text-red-800',
      'cultural': 'bg-amber-100 text-amber-800',
      'social_emotional': 'bg-pink-100 text-pink-800',
      'physical': 'bg-indigo-100 text-indigo-800'
    };
    
    return areaColorMap[area] || 'bg-gray-100 text-gray-800';
  };
  
  const handleCloseActivityRecord = () => {
    // Clear the selected activity and update the URL without the record parameter
    setSelectedActivity(null);
    router.push(`/dashboard/children/${childId}`);
  };
  
  // Handle generate plan
  const handleGeneratePlan = async (childId: string, weekStartDate?: Date) => {
    if (!currentUser) return;
    
    try {
      setIsGeneratingPlan(true);
      await generateWeeklyPlan(childId, currentUser.uid, weekStartDate);
      // Refresh the page to show the new plan
      router.refresh();
    } catch (error) {
      console.error('Error generating plan:', error);
      setError('Failed to generate plan');
    } finally {
      setIsGeneratingPlan(false);
    }
  };
  
  // Handle marking a material as owned
  const handleMarkMaterialOwned = async (materialId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      // Update in database
      await updateUserMaterial(currentUser.uid, materialId, true);
      
      // Refresh the materials forecast
      materialsForecastRef.current?.fetchMaterialsNeeded();
    } catch (error) {
      console.error('Error marking material as owned:', error);
      setError('Failed to update material status');
    }
  };
  
  if (loading || currentUser === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-lg">
        <h2 className="text-lg font-medium mb-2">Error</h2>
        <p>{error}</p>
        <Link
          href="/dashboard/children"
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
        >
          Back to Children
        </Link>
      </div>
    );
  }
  
  if (!child) {
    return (
      <div className="bg-yellow-50 text-yellow-700 p-6 rounded-lg">
        <h2 className="text-lg font-medium mb-2">Child Not Found</h2>
        <p>The requested child profile could not be found.</p>
        <Link
          href="/dashboard/children"
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
        >
          Back to Children
        </Link>
      </div>
    );
  }
  
  // Activity Record Modal
  const renderActivityRecordModal = () => {
    if (!selectedActivity) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Activity Record</h3>
            <button
              onClick={handleCloseActivityRecord}
              className="text-gray-400 hover:text-gray-500"
            >
              &times;
            </button>
          </div>
          
          <div className="p-4">
            <h4 className="text-xl font-medium text-gray-900">{selectedActivity.activityTitle || 'Activity'}</h4>
            
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedActivity.completionStatus)}`}>
                {selectedActivity.completionStatus.charAt(0).toUpperCase() + selectedActivity.completionStatus.slice(1).replace('_', ' ')}
              </span>
              
              <span className="text-xs text-gray-500 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDateWithYear(selectedActivity.date)}
              </span>
              
              {selectedActivity.engagementLevel && (
                <span className="text-xs text-gray-600 flex items-center">
                  <Star className="h-3 w-3 mr-1" />
                  Engagement: {selectedActivity.engagementLevel.charAt(0).toUpperCase() + selectedActivity.engagementLevel.slice(1)}
                </span>
              )}
            </div>
            
            {selectedActivity.notes && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700">Notes:</h5>
                <p className="mt-1 text-gray-600">{selectedActivity.notes}</p>
              </div>
            )}
            
            {selectedActivity.photoUrls && selectedActivity.photoUrls.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700">Photos:</h5>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {selectedActivity.photoUrls.map((url, idx) => (
                    <div key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden">
                      <img src={url} alt="Activity documentation" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedActivity.skillsDemonstrated && selectedActivity.skillsDemonstrated.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700">Skills Demonstrated:</h5>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedActivity.skillsDemonstrated.map(skillId => (
                    <span key={skillId} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {skillId}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseActivityRecord}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto">
      {/* Child Profile Header */}
      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xl font-bold">
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{child.name}</h1>
              <p className="text-gray-500">
                {child.birthDate ? (
                  <>
                    {formatAge(child.birthDate)} old • {child.ageGroup}
                  </>
                ) : (
                  child.ageGroup
                )}
              </p>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Link
              href={`/dashboard/children/${childId}/edit`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Link>
          </div>
        </div>
        
        {child.interests && child.interests.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-medium text-gray-500">Interests:</h2>
            <div className="mt-1 flex flex-wrap gap-2">
              {child.interests.map(interest => (
                <span key={interest} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {child.notes && (
          <div className="mt-4">
            <h2 className="text-sm font-medium text-gray-500">Notes:</h2>
            <p className="mt-1 text-gray-600">{child.notes}</p>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly Plan Card */}
        <Link href={`/dashboard/children/${childId}/weekly-plan`} className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Weekly Plan</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">View and manage your child's weekly activity schedule</p>
          <div className="flex items-center text-sm text-blue-600">
            View Schedule
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </div>
        </Link>

        {/* Progress Tracking Card */}
        <Link href={`/dashboard/children/${childId}/progress`} className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart2 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Progress Tracking</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Monitor your child's developmental progress and milestones</p>
          <div className="flex items-center text-sm text-purple-600">
            View Progress
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </div>
        </Link>

        {/* Materials Needed Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Package className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Materials Needed</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Track materials needed for upcoming activities</p>
          <AllChildrenMaterialsForecast
            ref={materialsForecastRef}
            selectedChildId={childId}
            onMarkMaterialOwned={handleMarkMaterialOwned}
          />
        </div>

        {/* Edit Profile Card */}
        <Link href={`/dashboard/children/${childId}/edit`} className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Edit className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Edit Profile</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Update your child's information and preferences</p>
          <div className="flex items-center text-sm text-gray-600">
            Edit Profile
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </div>
        </Link>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>
        
        <div className="space-y-4">
          {recentActivities.length > 0 ? (
            recentActivities.map(activity => (
              <div 
                key={activity.id} 
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/dashboard/children/${childId}?record=${activity.id}`)}
              >
                <div className="flex justify-between">
                  <h3 className="font-medium text-gray-900">{activity.activityTitle || 'Activity'}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(activity.completionStatus)}`}>
                    {activity.completionStatus.charAt(0).toUpperCase() + activity.completionStatus.slice(1).replace('_', ' ')}
                  </span>
                </div>
                
                <div className="mt-1 flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(activity.date)}
                  
                  {activity.engagementLevel && (
                    <span className="ml-3 capitalize">
                      Engagement: {activity.engagementLevel}
                    </span>
                  )}
                </div>
                
                {activity.notes && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{activity.notes}</p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity recorded</p>
            </div>
          )}
        </div>
      </div>

      {/* Child Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={`/dashboard/children/${childId}/edit`}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit Profile
        </Link>
        <Link
          href={`/dashboard/children/${childId}/progress`}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <BarChart2 className="h-4 w-4 mr-1" />
          Track Progress
        </Link>
        <Link
          href={`/dashboard/children/${childId}/weekly-plan`}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Weekly Plan
        </Link>
        <Link
          href={`/dashboard/children/${childId}/development`}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Award className="h-4 w-4 mr-1" />
          Development Journey
        </Link>
      </div>
    </div>
  );
}