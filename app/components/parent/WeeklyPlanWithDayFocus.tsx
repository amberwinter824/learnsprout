// app/components/parent/WeeklyPlanWithDayFocus.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Star, 
  ChevronRight,
  ChevronLeft, 
  Loader2,
  User,
  Filter,
  Info as InfoIcon,
  PlusCircle,
  AlertCircle,
  Shuffle
} from 'lucide-react';
import { format, isToday, addDays, subDays, isSameDay, startOfWeek, endOfWeek, getDay, formatISO } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, orderBy, limit, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import ActivityDetailsPopup from './ActivityDetailsPopup';
import QuickObservationForm from './QuickObservationForm';
import WeeklyPlanEmptyState from './WeeklyPlanEmptyState';
import { getUserMaterials } from '@/lib/materialsService';

// Define types
interface Activity {
  id: string;
  activityId: string;
  childId: string;
  childName: string;
  title: string;
  description?: string;
  duration?: number;
  area?: string;
  status: 'suggested' | 'confirmed' | 'completed';
  isHomeSchoolConnection?: boolean;
  timeSlot?: string;
  order?: number;
  lastObservedDate?: Date | any;
  lastObservation?: {
    engagementLevel?: string;
    interestLevel?: string;
    completionDifficulty?: string;
    notes?: string;
    skillsDemonstrated?: string[];
  };
  materialsNeeded?: string[];
  skillsAddressed?: string[];
  tags?: string[];
  keywords?: string[];
}

interface DayActivities {
  date: Date;
  dayName: string;
  dayOfWeek: string;
  activities: Activity[];
  hasPlan: boolean;
  isRestDay: boolean; // Flag for days with intentionally no activities
}

interface Child {
  id: string;
  name: string;
  ageGroup?: string;
  preferences?: {
    activityPreferences?: {
      scheduleByDay?: {[key: string]: number};
    };
  };
}

interface WeeklyPlanWithDayFocusProps {
  selectedDate?: Date;
  onGeneratePlan?: (childId: string, weekStartDate?: Date) => Promise<any>;
}

// Add cache interface
interface WeeklyPlanCache {
  [key: string]: {
    data: DayActivities[];
    timestamp: number;
  };
}

export default function WeeklyPlanWithDayFocus({ 
  selectedDate: initialDate,
  onGeneratePlan
}: WeeklyPlanWithDayFocusProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  // State
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [weekStartDate, setWeekStartDate] = useState<Date>(getWeekStart(selectedDate));
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [weekActivities, setWeekActivities] = useState<DayActivities[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsActivityId, setDetailsActivityId] = useState<string | null>(null);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [weekHasPlan, setWeekHasPlan] = useState(false);
  const [ownedMaterialIds, setOwnedMaterialIds] = useState<string[]>([]);
  const [materialLookup, setMaterialLookup] = useState<Map<string, any>>(new Map());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isShuffling, setIsShuffling] = useState<{[key: string]: boolean}>({});
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  
  // Add cache state
  const [planCache, setPlanCache] = useState<WeeklyPlanCache>({});
  
  // Check if schedule preferences are set
  const hasSchedulePreferences = useMemo(() => {
    if (!currentUser?.preferences?.activityPreferences?.scheduleByDay) return false;
    return Object.values(currentUser.preferences.activityPreferences.scheduleByDay).some(count => count > 0);
  }, [currentUser]);
  
  // Helper function to get the start of the week (Monday)
  function getWeekStart(date: Date): Date {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return weekStart;
  }
  
  // Update selected date and week start when initialDate changes
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
      setWeekStartDate(getWeekStart(initialDate));
    }
  }, [initialDate]);
  
  // Handle child selection
  const handleChildSelect = (childId: string) => {
    const child = allChildren.find(c => c.id === childId);
    if (child) {
      setSelectedChild(child);
      setWeekActivities([]);
      setWeekHasPlan(false);
    }
  };
  
  // Fetch all children for the current user
  useEffect(() => {
    if (!currentUser) return;
    
    async function fetchChildren() {
      try {
        setLoading(true);
        
        const childrenQuery = query(
          collection(db, 'children'),
          where('parentId', '==', currentUser?.uid || ''),
          orderBy('name')
        );
        
        const childrenSnapshot = await getDocs(childrenQuery);
        
        if (childrenSnapshot.empty) {
          setAllChildren([]);
          setLoading(false);
          return;
        }
        
        // Store all children
        const children: Child[] = childrenSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          ageGroup: doc.data().ageGroup,
          preferences: doc.data().preferences || {}
        }));
        
        setAllChildren(children);
        
        // If no child is selected yet, select the first one
        if (!selectedChild && children.length > 0) {
          setSelectedChild(children[0]);
        }
      } catch (error) {
        console.error('Error fetching children:', error);
        setError('Failed to load children');
      } finally {
        setLoading(false);
      }
    }
    
    fetchChildren();
  }, [currentUser, selectedChild]);
  
  // Add useEffect to load owned materials
  useEffect(() => {
    const fetchOwnedMaterials = async () => {
      if (!currentUser?.uid) return;
      
      try {
        // Get materials the user owns
        const ownedIds = await getUserMaterials(currentUser.uid);
        setOwnedMaterialIds(ownedIds);
        
        // Get all materials to create a lookup table
        const materialsRef = collection(db, 'materials');
        const materialsSnapshot = await getDocs(materialsRef);
        
        const materials = new Map();
        materialsSnapshot.forEach(doc => {
          const data = doc.data();
          materials.set(data.normalizedName, {
            id: doc.id,
            ...data
          });
        });
        
        setMaterialLookup(materials);
      } catch (error) {
        console.error('Error fetching owned materials:', error);
      }
    };
    
    if (currentUser?.uid) {
      fetchOwnedMaterials();
    }
  }, [currentUser]);
  
  // Optimize fetchWeekActivities
  const fetchWeekActivitiesRef = useCallback(async () => {
    if (!currentUser || !selectedChild) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const cacheKey = `${selectedChild.id}_${format(weekStartDate, 'yyyy-MM-dd')}`;
      
      // Check cache first
      const cachedData = planCache[cacheKey];
      if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minute cache
        setWeekActivities(cachedData.data);
        setWeekHasPlan(cachedData.data.some(day => day.hasPlan));
        setLoading(false);
        return;
      }
      
      // Initialize week structure
      const weekDays: DayActivities[] = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStartDate, i);
        return {
          date,
          dayName: format(date, 'EEEE'),
          dayOfWeek: format(date, 'EEE'),
          activities: [],
          hasPlan: false,
          isRestDay: false
        };
      });
      
      // Fetch the weekly plan
      const planId = `${selectedChild.id}_${format(weekStartDate, 'yyyy-MM-dd')}`;
      const planDocRef = doc(db, 'weeklyPlans', planId);
      const planDoc = await getDoc(planDocRef);
      
      if (planDoc.exists()) {
        const planData = planDoc.data();
        const activityIds = new Set<string>();
        
        // Collect all activity IDs
        Object.values(planData).forEach((dayData: any) => {
          if (Array.isArray(dayData)) {
            dayData.forEach((activity: any) => {
              activityIds.add(activity.activityId);
            });
          }
        });
        
        // Batch fetch all activities
        const activityPromises = Array.from(activityIds).map(id => 
          getDoc(doc(db, 'activities', id))
        );
        const activitySnapshots = await Promise.all(activityPromises);
        const activitiesMap = new Map(
          activitySnapshots.map(snap => [snap.id, snap.data()])
        );
        
        // Process each day's activities
        Object.entries(planData).forEach(([dayKey, dayActivities]: [string, any]) => {
          if (!Array.isArray(dayActivities)) return;
          
          const dayIndex = weekDays.findIndex(d => 
            d.dayName.toLowerCase() === dayKey.toLowerCase()
          );
          if (dayIndex === -1) return;
          
          const processedActivities = dayActivities.map((activity: any) => {
            const activityData = activitiesMap.get(activity.activityId);
            if (!activityData) return null;
            
            return {
              id: `${planId}_${dayKey}_${activity.activityId}`,
              activityId: activity.activityId,
              childId: selectedChild.id,
              childName: selectedChild.name,
              title: activityData.title || 'Unknown Activity',
              description: activityData.description,
              duration: activityData.duration || 15,
              area: activityData.area,
              status: activity.status || 'suggested',
              isHomeSchoolConnection: activityData.isHomeSchoolConnection,
              timeSlot: activity.timeSlot,
              order: activity.order || 0,
              lastObservedDate: activity.lastObservedDate,
              materialsNeeded: activityData.materialsNeeded,
              skillsAddressed: activityData.skillsAddressed,
              tags: activityData.tags,
              keywords: activityData.keywords
            } as Activity;
          }).filter((activity): activity is Activity => activity !== null);
          
          weekDays[dayIndex].activities = processedActivities;
          weekDays[dayIndex].hasPlan = processedActivities.length > 0;
        });
      }
      
      // Update cache
      setPlanCache(prev => ({
        ...prev,
        [cacheKey]: {
          data: weekDays,
          timestamp: Date.now()
        }
      }));
      
      setWeekActivities(weekDays);
      setWeekHasPlan(weekDays.some(day => day.hasPlan));
    } catch (error) {
      console.error('Error fetching weekly plan:', error);
      setError('Failed to load weekly plan');
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedChild, weekStartDate, planCache]);
  
  // Update useEffect to use the optimized fetch function
  useEffect(() => {
    let isMounted = true;
    
    if (selectedChild) {
      fetchWeekActivitiesRef().then(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    } else {
      setWeekActivities([]);
      setWeekHasPlan(false);
      setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [selectedChild, weekStartDate, refreshTrigger, fetchWeekActivitiesRef]);
  
  // Add this useEffect to watch for changes in user preferences
  useEffect(() => {
    if (currentUser?.preferences?.activityPreferences?.scheduleByDay && selectedChild) {
      console.log('Schedule preferences changed, triggering plan regeneration');
      // Set updating state
      setIsUpdatingPlan(true);
      
      // Reset week activities and plan status
      setWeekActivities([]);
      setWeekHasPlan(false);
      
      // Generate a new plan
      handleGeneratePlan().finally(() => {
        setIsUpdatingPlan(false);
      });
    }
  }, [currentUser?.preferences?.activityPreferences?.scheduleByDay, selectedChild]);
  
  // Add this useEffect to refresh the plan when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Refreshing plan due to trigger:', refreshTrigger);
      // Reset loading state to show loading indicator
      setLoading(true);
      fetchWeekActivitiesRef();
    }
  }, [refreshTrigger, selectedChild, weekStartDate]);
  
  // Add this useEffect to watch for changes in the selected child
  useEffect(() => {
    if (selectedChild) {
      console.log('Selected child changed, refreshing plan');
      setLoading(true);
      fetchWeekActivitiesRef();
    }
  }, [selectedChild]);
  
  // Navigate to previous/next week
  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newWeekStart = direction === 'prev' 
      ? subDays(weekStartDate, 7) 
      : addDays(weekStartDate, 7);
    
    setWeekStartDate(newWeekStart);
    
    // Also update selected date to match the start of the new week
    if (!isSameDay(selectedDate, newWeekStart)) {
      setSelectedDate(newWeekStart);
    }
  };
  
  // Handle day selection
  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };
  
  // Get activities for the selected day
  const getSelectedDayActivities = () => {
    const selectedDayOfWeek = format(selectedDate, 'EEE').toLowerCase();
    const selectedDay = weekActivities.find(day => 
      day.dayOfWeek.toLowerCase() === selectedDayOfWeek
    );
    return selectedDay || null;
  };
  
  // Get color for activity area
  const getAreaColor = (area?: string) => {
    const areaColors: Record<string, string> = {
      'practical_life': 'bg-pink-100 text-pink-800',
      'sensorial': 'bg-purple-100 text-purple-800',
      'language': 'bg-blue-100 text-blue-800',
      'mathematics': 'bg-green-100 text-green-800',
      'cultural': 'bg-yellow-100 text-yellow-800',
      'science': 'bg-teal-100 text-teal-800',
      'art': 'bg-indigo-100 text-indigo-800'
    };
    return area && areaColors[area] ? areaColors[area] : 'bg-gray-100 text-gray-800';
  };
  
  // Format observed date for display
  const formatObservedDate = (date: Date | string | any) => {
    if (!date) return '';
    
    let dateObj: Date;
    
    // If it's a Firestore timestamp
    if (date && typeof date === 'object' && 'seconds' in date) {
      dateObj = new Date(date.seconds * 1000);
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date as Date;
    }
    
    if (isToday(dateObj)) {
      return 'Today';
    }
    
    return format(dateObj, 'MMM d');
  };
  
  // And update the handleGeneratePlan function to use the reference
  const handleGeneratePlan = async () => {
    if (!selectedChild || !onGeneratePlan) {
      console.error("Cannot generate plan: missing child or onGeneratePlan function");
      return;
    }
    
    try {
      setIsGeneratingPlan(true);
      setError(null);
      console.log("Starting plan generation for child:", selectedChild.id, "for week starting:", weekStartDate);
      
      // Add a minimum delay of 8 seconds to show the loading state
      const delayPromise = new Promise(resolve => setTimeout(resolve, 8000));
      
      // Run plan generation and delay in parallel
      const [result] = await Promise.all([
        onGeneratePlan(selectedChild.id, weekStartDate),
        delayPromise
      ]);
      
      console.log("Plan generated successfully:", result);
      
      // Set a success message
      setError("Weekly plan generated successfully!");
      setTimeout(() => setError(null), 3000);
      
      // Important: Trigger a refetch of the activities
      fetchWeekActivitiesRef();
      
    } catch (error) {
      console.error('Error generating plan:', error);
      setError(`Failed to generate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingPlan(false);
    }
  };
  
  // Open activity details popup
  const openActivityDetails = (activityId: string) => {
    setDetailsActivityId(activityId);
    setShowDetailsPopup(true);
  };
  
  // Open observation form
  const openObservationForm = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowActivityForm(true);
  };
  
  // Modify handleObservationSuccess to trigger refresh
  const handleObservationSuccess = async () => {
    setShowActivityForm(false);
    setSelectedActivity(null);
    
    // Trigger refresh
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Add a function to trigger refresh from outside
  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Get activity count for a day
  const getDayActivityCount = (day: DayActivities) => {
    return day.activities.length;
  };
  
  // Get completed activity count for a day
  const getDayCompletedCount = (day: DayActivities) => {
    return day.activities.filter(a => a.status === 'completed').length;
  };
  
  // Add a function to check if an activity can be done with owned materials
  const canDoActivityWithOwnedMaterials = (activity: Activity) => {
    // If no materials needed, activity can be done
    if (!activity.materialsNeeded || !Array.isArray(activity.materialsNeeded) || activity.materialsNeeded.length === 0) {
      return true;
    }
    
    // Check if all required materials are owned
    return activity.materialsNeeded.every(materialName => {
      const normalizedName = materialName.trim().toLowerCase();
      const material = materialLookup.get(normalizedName);
      
      // If material isn't in our database, we can't check if it's owned
      if (!material) return false;
      
      // Check if the user owns this material
      return ownedMaterialIds.includes(material.id);
    });
  };
  
  // Add shuffle handler function
  const handleShuffleActivity = async (activity: Activity, dayOfWeek: string) => {
    if (!selectedChild || !currentUser) return;
    
    try {
      setIsShuffling(prev => ({ ...prev, [activity.id]: true }));
      setError(null);
      
      // Get the current plan
      const weekStartString = format(weekStartDate, 'yyyy-MM-dd');
      const planId = `${selectedChild.id}_${weekStartString}`;
      const planRef = doc(db, 'weeklyPlans', planId);
      const planDoc = await getDoc(planRef);
      
      if (!planDoc.exists()) {
        throw new Error('Plan not found');
      }
      
      const planData = planDoc.data();
      const dayActivities = planData[dayOfWeek] || [];
      
      // Get child's age group and interests
      const childDoc = await getDoc(doc(db, 'children', selectedChild.id));
      if (!childDoc.exists()) {
        throw new Error('Child not found');
      }
      
      const childData = childDoc.data();
      const ageGroup = childData.ageGroup;
      const interests = childData.interests || [];
      
      // Get child's skills
      const skillsQuery = query(
        collection(db, 'childSkills'),
        where('childId', '==', selectedChild.id)
      );
      const skillsSnapshot = await getDocs(skillsQuery);
      const childSkills: Record<string, string> = {};
      skillsSnapshot.forEach(doc => {
        const data = doc.data();
        childSkills[data.skillId] = data.status;
      });
      
      // Get recent activities
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentActivitiesQuery = query(
        collection(db, 'progressRecords'),
        where('childId', '==', selectedChild.id),
        where('date', '>=', thirtyDaysAgo)
      );
      const recentActivitiesSnapshot = await getDocs(recentActivitiesQuery);
      const recentActivities: Record<string, any> = {};
      recentActivitiesSnapshot.forEach(doc => {
        const data = doc.data();
        if (!recentActivities[data.activityId]) {
          recentActivities[data.activityId] = {
            lastCompleted: data.date,
            completionCount: 0,
            engagement: data.engagementLevel || 'medium',
            interest: data.interestLevel || 'medium'
          };
        }
        recentActivities[data.activityId].completionCount++;
      });
      
      // Get suitable activities for this age group
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('ageRanges', 'array-contains', ageGroup),
        where('status', '==', 'active')
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      let activities: Activity[] = [];
      
      activitiesSnapshot.forEach(doc => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          title: data.title,
          ...data
        } as Activity);
      });
      
      // Filter out current activity and any activities already in the day's plan
      const currentActivityIds = dayActivities.map((a: any) => a.activityId);
      activities = activities.filter(a => 
        a.id !== activity.activityId && 
        !currentActivityIds.includes(a.id)
      );
      
      // Score and rank activities
      const scoredActivities = await Promise.all(activities.map(async activity => {
        let score = 5; // Base score
        const reasons: string[] = [];
        
        // Factor 1: Skills addressed
        const activitySkills = activity.skillsAddressed || [];
        for (const skillId of activitySkills) {
          const skillStatus = childSkills[skillId] || 'unknown';
          if (skillStatus === 'emerging') {
            score += 3;
            reasons.push(`Helps develop emerging skill`);
          } else if (skillStatus === 'developing') {
            score += 2;
            reasons.push(`Reinforces developing skill`);
          } else if (skillStatus === 'mastered') {
            score += 0.5;
            reasons.push(`Maintains mastered skill`);
          } else {
            score += 2;
            reasons.push(`Introduces new skill`);
          }
        }
        
        // Factor 2: Child's interests
        for (const interest of interests) {
          if (activity.area && activity.area.toLowerCase().includes(interest.toLowerCase())) {
            score += 2;
            reasons.push(`Matches child's interest in ${interest}`);
          }
          if (activity.tags?.includes(interest) || activity.keywords?.includes(interest)) {
            score += 2;
            reasons.push(`Tagged with child's interest: ${interest}`);
          }
        }
        
        // Factor 3: Material availability
        const activityMaterials = activity.materialsNeeded || [];
        const hasAllMaterials = await canDoActivityWithOwnedMaterials(activity);
        
        if (hasAllMaterials) {
          score += 3;
          reasons.push('All needed materials available');
        }
        
        // Factor 4: Recent completion and engagement
        const recent = recentActivities[activity.id];
        if (recent) {
          const daysSinceCompletion = Math.floor((Date.now() - recent.lastCompleted.toMillis()) / (24 * 60 * 60 * 1000));
          if (daysSinceCompletion < 7) {
            score -= 2;
            reasons.push(`Completed recently (${daysSinceCompletion} days ago)`);
          } else if (recent.engagement === 'high' || recent.interest === 'high') {
            score += 2;
            reasons.push(`Child showed high engagement previously`);
          }
          if (recent.completionCount > 3) {
            score -= 1;
            reasons.push(`Already completed ${recent.completionCount} times recently`);
          }
        } else {
          score += 1;
          reasons.push(`New activity`);
        }
        
        return {
          ...activity,
          score,
          reasons
        };
      }));
      
      // Sort by score and pick the highest scoring activity
      scoredActivities.sort((a, b) => b.score - a.score);
      const newActivity = scoredActivities[0];
      
      if (!newActivity) {
        throw new Error('No suitable replacement activity found');
      }
      
      // Update the plan with the new activity
      const updatedDayActivities = dayActivities.map((a: any) => 
        a.activityId === activity.activityId 
          ? {
              ...a,
              activityId: newActivity.id,
              notes: newActivity.reasons.join('. ')
            }
          : a
      );
      
      await updateDoc(planRef, {
        [dayOfWeek]: updatedDayActivities,
        updatedAt: serverTimestamp()
      });
      
      // Trigger refresh to show the new activity
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('Error shuffling activity:', error);
      setError(`Failed to shuffle activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsShuffling(prev => ({ ...prev, [activity.id]: false }));
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-64 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading activities...</p>
        </div>
      </div>
    );
  }
  
  // No children state
  if (allChildren.length === 0) {
    return (
      <div className="text-center py-6 bg-white rounded-lg shadow-sm">
        <User className="h-10 w-10 mx-auto text-gray-400 mb-2" />
        <h3 className="text-lg font-medium text-gray-700 mb-1">No children profiles</h3>
        <p className="text-gray-500 text-sm mb-4">
          Add a child profile to see daily activities
        </p>
        <Link 
          href="/dashboard/children/add"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md"
        >
          Add Child
        </Link>
      </div>
    );
  }
  
  // Determine if selected day is a rest day
  const selectedDayActivities = getSelectedDayActivities();
  const isSelectedDayRestDay = selectedDayActivities?.isRestDay || false;
  
  return (
    <div className="space-y-6">
      {/* Weekly calendar view */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-medium text-gray-900">Weekly Plan</h2>
              {allChildren.length > 1 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">for</span>
                  <select
                    value={selectedChild?.id || ''}
                    onChange={(e) => handleChildSelect(e.target.value)}
                    className="text-sm font-medium text-gray-900 bg-transparent border-0 focus:ring-0 focus:outline-none"
                  >
                    {allChildren.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {allChildren.length === 1 && selectedChild && (
                <span className="text-sm text-gray-500">
                  for {selectedChild.name}
                </span>
              )}
            </div>
            
            {/* Week navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleWeekChange('prev')}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <span className="text-sm text-gray-600">
                Week of {format(weekStartDate, 'MMM d')}
              </span>
              <button
                onClick={() => handleWeekChange('next')}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Weekly calendar strip */}
        <div className="px-2 py-4 border-b border-gray-200">
          <div className="flex justify-between">
            {weekActivities.map((day, index) => (
              <div 
                key={day.dayOfWeek}
                onClick={() => handleDaySelect(day.date)}
                className={`
                  w-24 mx-0.5 p-1.5 border rounded-lg cursor-pointer transition-colors
                  ${isSameDay(day.date, selectedDate) 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 hover:border-emerald-300 bg-white'}
                  ${day.isRestDay ? 'opacity-75 bg-gray-50' : ''}
                `}
              >
                <div className="text-center mb-1">
                  <p className={`text-xs font-medium ${isSameDay(day.date, selectedDate) ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {day.dayName.substring(0, 3).toUpperCase()}
                  </p>
                  <p className={`text-base font-bold ${isSameDay(day.date, selectedDate) ? 'text-emerald-700' : 'text-gray-700'}`}>
                    {format(day.date, 'd')}
                  </p>
                </div>
                
                <div className="text-center">
                  {day.isRestDay ? (
                    <p className="text-xs text-gray-500">Rest</p>
                  ) : day.activities.length === 0 ? (
                    <p className="text-xs text-gray-500">-</p>
                  ) : (
                    <div className="flex justify-center space-x-0.5">
                      {[...Array(Math.min(day.activities.length, 2))].map((_, i) => (
                        <div 
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSameDay(day.date, selectedDate) ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                      {day.activities.length > 2 && (
                        <span className="text-xs text-gray-500">+{day.activities.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Main content - Selected day activities */}
        <div className="p-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {/* No weekly plan state */}
          {!weekHasPlan && selectedChild && (
            <WeeklyPlanEmptyState
              childId={selectedChild.id}
              childName={selectedChild.name}
              onGeneratePlan={handleGeneratePlan}
              isGenerating={isGeneratingPlan}
            />
          )}
          
          {/* Selected day heading */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            
            {selectedDayActivities && (
              <p className="text-sm text-gray-500">
                {selectedDayActivities.activities.length} {selectedDayActivities.activities.length === 1 ? 'activity' : 'activities'}
                {selectedDayActivities.activities.filter(a => a.status === 'completed').length > 0 && 
                 `, ${selectedDayActivities.activities.filter(a => a.status === 'completed').length} completed`}
              </p>
            )}
          </div>
          
          {/* Day activities or empty state */}
          {selectedDayActivities && (
            <div>
              {selectedDayActivities.activities.length > 0 ? (
                <div className="space-y-4">
                  {selectedDayActivities.activities.map(activity => (
                    <div 
                      key={activity.id}
                      className={`border rounded-lg overflow-hidden ${
                        activity.status === 'completed' ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{activity.title}</h4>
                            {activity.description && (
                              <p className="mt-1 text-sm text-gray-600">{activity.description}</p>
                            )}
                          </div>
                          {activity.status === 'completed' && (
                            <div className="relative group">
                              <span className="flex items-center text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full text-xs cursor-help">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {activity.lastObservedDate ? (
                                  <>Last observed: {formatObservedDate(activity.lastObservedDate)}</>
                                ) : (
                                  <>Observed</>
                                )}
                              </span>
                              {activity.lastObservation && (
                                <div className="fixed z-[9999] hidden group-hover:block">
                                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 w-[300px]" style={{ position: 'fixed', transform: 'translate(-20px, -100%)' }}>
                                    <div className="space-y-2">
                                      {activity.lastObservation.engagementLevel && (
                                        <div className="flex items-center text-sm">
                                          <span className="font-medium text-gray-700 min-w-[80px]">Engagement:</span>
                                          <span className="ml-2 capitalize text-gray-600">{activity.lastObservation.engagementLevel}</span>
                                        </div>
                                      )}
                                      {activity.lastObservation.interestLevel && (
                                        <div className="flex items-center text-sm">
                                          <span className="font-medium text-gray-700 min-w-[80px]">Interest:</span>
                                          <span className="ml-2 capitalize text-gray-600">{activity.lastObservation.interestLevel}</span>
                                        </div>
                                      )}
                                      {activity.lastObservation.completionDifficulty && (
                                        <div className="flex items-center text-sm">
                                          <span className="font-medium text-gray-700 min-w-[80px]">Difficulty:</span>
                                          <span className="ml-2 capitalize text-gray-600">{activity.lastObservation.completionDifficulty}</span>
                                        </div>
                                      )}
                                      {activity.lastObservation.notes && (
                                        <div className="text-sm">
                                          <span className="font-medium text-gray-700">Notes:</span>
                                          <p className="mt-1 text-gray-600 line-clamp-2">{activity.lastObservation.notes}</p>
                                        </div>
                                      )}
                                      {activity.lastObservation.skillsDemonstrated && activity.lastObservation.skillsDemonstrated.length > 0 && (
                                        <div className="text-sm">
                                          <span className="font-medium text-gray-700">Skills:</span>
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {activity.lastObservation.skillsDemonstrated.map((skill, index) => (
                                              <span key={index} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                                                {skill}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                                      <div className="w-2 h-2 bg-white rotate-45 transform origin-center -mt-1 border-r border-b border-gray-200"></div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500 space-x-3 mt-2">
                          {activity.area && (
                            <span className={`px-2 py-0.5 rounded-full ${getAreaColor(activity.area)}`}>
                              {activity.area.replace(/_/g, ' ')}
                            </span>
                          )}
                          {activity.duration && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {activity.duration} min
                            </span>
                          )}
                          {activity.timeSlot && (
                            <span className="capitalize">
                              {activity.timeSlot}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 px-4 py-2 flex space-x-4">
                        <button
                          onClick={() => openActivityDetails(activity.activityId)}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                          type="button"
                        >
                          <InfoIcon className="h-3 w-3 mr-1" />
                          How to
                        </button>
                        <button
                          onClick={() => openObservationForm(activity)}
                          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center"
                          type="button"
                        >
                          <PlusCircle className="h-3 w-3 mr-1" />
                          {activity.status === 'completed' ? 'Add Another Observation' : 'Add Observation'}
                        </button>
                        <button
                          onClick={() => handleShuffleActivity(activity, selectedDayActivities.dayOfWeek)}
                          className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
                          type="button"
                          disabled={isShuffling[activity.id]}
                        >
                          {isShuffling[activity.id] ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Shuffle className="h-3 w-3 mr-1" />
                          )}
                          Shuffle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  {selectedDayActivities.isRestDay ? (
                    <>
                      <p className="text-gray-700 font-medium mb-2">
                        Rest Day
                      </p>
                      <p className="text-gray-500 text-sm">
                        No activities scheduled for {format(selectedDate, 'EEEE')} based on your preferences.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700 font-medium mb-2">
                        No activities planned for {format(selectedDate, 'EEEE')}.
                      </p>
                      <p className="text-gray-500 text-sm mb-4">
                        You can add activities to this day or update your weekly preferences.
                      </p>
                      <Link
                        href="/dashboard/settings"
                        className="text-sm text-emerald-600 hover:text-emerald-700"
                      >
                        Update Schedule Preferences
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Activity Details Popup */}
        {showDetailsPopup && detailsActivityId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
              <ActivityDetailsPopup 
                activityId={detailsActivityId} 
                onClose={() => setShowDetailsPopup(false)}
              />
            </div>
          </div>
        )}
        
        {/* Observation Form Modal */}
        {showActivityForm && selectedActivity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <QuickObservationForm
                activityId={selectedActivity.activityId}
                childId={selectedActivity.childId}
                activityTitle={selectedActivity.title}
                onSuccess={handleObservationSuccess}
                onClose={() => setShowActivityForm(false)}
              />
            </div>
          </div>
        )}
        
        {!hasSchedulePreferences && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-6 text-center">
            <Calendar className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-amber-800 mb-2">
              Schedule Preferences Required
            </h3>
            <p className="text-amber-700 mb-4">
              To generate a personalized weekly plan, please set your preferred schedule in the sidebar.
            </p>
            <div className="flex justify-center">
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700"
              >
                Set Schedule Preferences
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}