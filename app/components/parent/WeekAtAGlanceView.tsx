// app/components/parent/WeekAtAGlanceView.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Star, 
  Loader2,
  ArrowLeft,
  Filter,
  Clock,
  X,
  Eye,
  EyeOff,
  Camera,
  Info,
  Plus,
  PlusCircle
} from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, isSameDay, isToday } from 'date-fns';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import ActivityDetailModal from '@/app/components/ActivityDetailModal';
import QuickObservationForm from '@/app/components/parent/QuickObservationForm';
import ActivityDetailsPopup from './ActivityDetailsPopup';
import AddActivityToWeeklyPlan from '../AddActivityToWeeklyPlan';

// Activity interface
interface Activity {
  id: string;
  activityId: string;
  title: string;
  area?: string;
  duration?: number;
  isHomeSchoolConnection?: boolean;
  status: 'suggested' | 'confirmed' | 'completed';
  timeSlot?: string;
  order?: number;
  description?: string;
  lastObservedDate?: Date | string;
}

// Day info interface
interface DayInfo {
  date: Date;
  dayName: string;
  dayShort: string;
  dayNumber: string;
  isToday: boolean;
}

// Activities by day
interface WeekActivities {
  [key: string]: Activity[];
}

interface WeekAtAGlanceViewProps {
  childId: string;
  childName: string;
  onSelectDay?: (date: Date) => void;
  onBackToDaily?: () => void;
  selectedDate?: Date;
}

export default function WeekAtAGlanceView({ 
  childId, 
  childName,
  onSelectDay,
  onBackToDaily,
  selectedDate
}: WeekAtAGlanceViewProps) {
  const router = useRouter();
  
  // State
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [weekActivities, setWeekActivities] = useState<WeekActivities>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weekPlanId, setWeekPlanId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [areaProgress, setAreaProgress] = useState<Record<string, number>>({});
  
  // Activity detail modal state
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  
  // Quick observation form state
  const [showQuickObservation, setShowQuickObservation] = useState(false);
  const [observationActivity, setObservationActivity] = useState<Activity | null>(null);
  
  // Activity details popup state
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [detailsActivityId, setDetailsActivityId] = useState<string | null>(null);
  
  // Add activity modal state
  const [showAddActivityModal, setShowAddActivityModal] = useState<boolean>(false);
  
  // Calculate week days for display
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i);
      return {
        date,
        dayName: format(date, 'EEEE'),
        dayShort: format(date, 'EEE'),
        dayNumber: format(date, 'd'),
        isToday: isToday(date)
      };
    });
  }, [currentWeek]);

  // Calculate weekStart for data fetching
  const weekStart = useMemo(() => {
    return startOfWeek(currentWeek, { weekStartsOn: 1 });
  }, [currentWeek]);

  // Extract fetchWeeklyPlan from useEffect to make it accessible
  const fetchWeeklyPlan = async () => {
    try {
      console.log('Fetching weekly plan for week starting:', format(weekStart, 'yyyy-MM-dd'));
      setLoading(true);
      setError(null);
      
      // Format date for query
      const weekStartDate = format(weekStart, 'yyyy-MM-dd');
      
      // First try to fetch by the plan ID format (childId_date)
      const planId = `${childId}_${weekStartDate}`;
      
      // Try to get the plan directly by ID first
      const planDocRef = doc(db, 'weeklyPlans', planId);
      const planDocSnap = await getDoc(planDocRef);
      
      let planData;
      let foundPlanId;
      
      if (planDocSnap.exists()) {
        planData = planDocSnap.data();
        foundPlanId = planDocSnap.id;
        setWeekPlanId(foundPlanId);
        
        // Set the selected day to today if it's in the current week, otherwise to Monday
        const today = format(new Date(), 'EEEE');
        const todayInWeek = weekDays.some(day => day.dayName === today);
        setSelectedDay(todayInWeek ? today : 'Monday');
        
      } else {
        // If not found by ID, try the query approach
        const plansQuery = query(
          collection(db, 'weeklyPlans'),
          where('childId', '==', childId),
          where('weekStarting', '==', weekStartDate)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        
        if (plansSnapshot.empty) {
          const emptyWeek: WeekActivities = {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: []
          };
          setWeekActivities(emptyWeek);
          setLoading(false);
          return;
        }
        
        // Use the first plan (should only be one per week)
        const planDoc = plansSnapshot.docs[0];
        planData = planDoc.data();
        foundPlanId = planDoc.id;
        setWeekPlanId(foundPlanId);
      }
      
      // Create a structure to hold activities by day
      const weekActivitiesData: WeekActivities = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      };
      
      // Process each day's activities
      const activitiesPromises: Promise<void>[] = [];
      
      Object.keys(planData).forEach(dayKey => {
        if (dayKey !== 'childId' && dayKey !== 'weekStarting' && Array.isArray(planData[dayKey])) {
          const dayActivities = planData[dayKey];
          const formattedDayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
          
          if (dayActivities.length > 0) {
            const dayPromise = Promise.all(
              dayActivities.map(async (activity: any) => {
                try {
                  // Check if there are observations for this activity
                  let lastObservedDate = null;
                  if (activity.observationIds && activity.observationIds.length > 0) {
                    lastObservedDate = activity.lastObservedDate || null;
                  } else {
                    try {
                      const observationsQuery = query(
                        collection(db, 'progressRecords'),
                        where('childId', '==', childId),
                        where('activityId', '==', activity.activityId)
                      );
                      
                      const observationsSnapshot = await getDocs(observationsQuery);
                      if (!observationsSnapshot.empty) {
                        // Sort observations by date (most recent first)
                        const sortedObservations = observationsSnapshot.docs
                          .map(doc => doc.data())
                          .sort((a, b) => {
                            const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
                            const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
                            return dateB.getTime() - dateA.getTime();
                          });
                        
                        if (sortedObservations.length > 0) {
                          lastObservedDate = sortedObservations[0].date;
                        }
                      }
                    } catch (observationError) {
                      console.error('Error fetching observations:', observationError);
                    }
                  }
                  
                  // Get activity details
                  const activityDocRef = doc(db, 'activities', activity.activityId);
                  const activityDoc = await getDoc(activityDocRef);
                  
                  if (activityDoc.exists()) {
                    const activityData = activityDoc.data();
                    return {
                      id: `${foundPlanId}_${formattedDayName}_${activity.activityId}`,
                      activityId: activity.activityId,
                      title: activityData.title,
                      description: activityData.description,
                      area: activityData.area,
                      duration: activityData.duration || 15,
                      isHomeSchoolConnection: activityData.environmentType === 'bridge' || 
                                             !!activityData.classroomExtension,
                      status: lastObservedDate ? 'completed' : (activity.status || 'suggested'),
                      timeSlot: activity.timeSlot,
                      order: activity.order,
                      lastObservedDate
                    };
                  }
                  
                  // If activity not found, still return the basic info
                  return {
                    id: `${foundPlanId}_${formattedDayName}_${activity.activityId}`,
                    activityId: activity.activityId,
                    title: 'Unknown Activity',
                    status: lastObservedDate ? 'completed' : (activity.status || 'suggested'),
                    timeSlot: activity.timeSlot,
                    order: activity.order,
                    lastObservedDate
                  };
                } catch (error) {
                  console.error(`Error fetching activity ${activity.activityId}:`, error);
                  return {
                    id: `${foundPlanId}_${formattedDayName}_${activity.activityId}`,
                    activityId: activity.activityId,
                    title: 'Error Loading Activity',
                    status: activity.status || 'suggested'
                  };
                }
              })
            );
            
            activitiesPromises.push(
              dayPromise.then(activitiesWithDetails => {
                weekActivitiesData[formattedDayName] = activitiesWithDetails.sort((a, b) => 
                  (a.order || 0) - (b.order || 0)
                );
              })
            );
          }
        }
      });
      
      await Promise.all(activitiesPromises);
      setWeekActivities(weekActivitiesData);
      setLoading(false);
      
    } catch (err) {
      console.error('Error fetching weekly plan:', err);
      setError('Failed to load weekly plan');
      setLoading(false);
    }
  };

  // Then in useEffect, just call this function
  useEffect(() => {
    fetchWeeklyPlan();
  }, [currentWeek, childId, weekStart]);
  
  // Navigate to previous week
  const handlePrevWeek = () => {
    setLoading(true);
    setError(null);
    setWeekActivities({});
    setCurrentWeek(prev => addWeeks(prev, -1));
  };
  
  // Navigate to next week
  const handleNextWeek = () => {
    setLoading(true);
    setError(null);
    setWeekActivities({});
    setCurrentWeek(prev => addWeeks(prev, 1));
  };
  
  // Handle activity selection for details
  const handleActivitySelect = (activity: Activity) => {
    setSelectedActivityId(activity.activityId);
    setShowActivityDetail(true);
  };
  
  // Handle adding observation
  const handleAddObservation = (activity: Activity) => {
    setObservationActivity(activity);
    setShowQuickObservation(true);
  };
  
  // Handle observation success
  const handleObservationSuccess = async () => {
    try {
      // Close the observation form
      setShowQuickObservation(false);
      
      if (!weekPlanId || !childId) return;
      
      // Refresh the weekly plan data
      setLoading(true);
      await fetchWeeklyPlan();
      
    } catch (error) {
      console.error('Error refreshing activities after observation:', error);
      setLoading(false);
    }
  };
  
  // Mark activity as completed
  const handleMarkCompleted = async (activity: Activity) => {
    try {
      if (!weekPlanId || !selectedDay) {
        console.error('Cannot mark activity as complete: missing weekPlanId or selectedDay');
        return;
      }
      
      // Reference to the weekly plan document
      const planRef = doc(db, 'weeklyPlans', weekPlanId);
      
      // Get the current plan data
      const planDoc = await getDoc(planRef);
      if (!planDoc.exists()) {
        console.error('Weekly plan not found');
        return;
      }
      
      const planData = planDoc.data();
      const dayKey = selectedDay.toLowerCase();
      
      if (!planData[dayKey]) {
        console.error(`No activities found for ${selectedDay}`);
        return;
      }
      
      // Find the activity and update its status
      const dayActivities = [...planData[dayKey]];
      const activityIndex = dayActivities.findIndex(a => a.activityId === activity.activityId);
      
      if (activityIndex === -1) {
        console.error(`Activity ${activity.activityId} not found in ${selectedDay}`);
        return;
      }
      
      // Update the activity status
      dayActivities[activityIndex] = {
        ...dayActivities[activityIndex],
        status: 'completed'
      };
      
      // Update the document
      await updateDoc(planRef, {
        [dayKey]: dayActivities
      });
      
      console.log(`Activity ${activity.activityId} marked as completed`);
      
      // Update local state to reflect the change
      setWeekActivities(prev => {
        const updatedActivities = { ...prev };
        if (updatedActivities[selectedDay]) {
          updatedActivities[selectedDay] = updatedActivities[selectedDay].map(a => 
            a.activityId === activity.activityId ? { ...a, status: 'completed' } : a
          );
        }
        return updatedActivities;
      });
      
    } catch (error) {
      console.error('Error marking activity as complete:', error);
    }
  };
  
  // Get color for activity area
  const getAreaColor = (area?: string): string => {
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
  
  // Calculate completion stats for the week
  const calculateWeekStats = () => {
    const totalActivities = Object.values(weekActivities).reduce(
      (sum, dayActivities) => sum + dayActivities.length, 
      0
    );
    
    const completedActivities = Object.values(weekActivities).reduce(
      (sum, dayActivities) => sum + dayActivities.filter(a => a.status === 'completed').length, 
      0
    );
    
    const areasSet = new Set<string>();
    Object.values(weekActivities).forEach(dayActivities => {
      dayActivities.forEach(activity => {
        if (activity.area) {
          areasSet.add(activity.area);
        }
      });
    });
    
    const uniqueAreas = Array.from(areasSet);
    
    return {
      totalActivities,
      completedActivities,
      percentComplete: totalActivities > 0 
        ? Math.round((completedActivities / totalActivities) * 100) 
        : 0,
      uniqueAreas
    };
  };
  
  const weekStats = calculateWeekStats();

  // Handle "How To" button click
  const handleHowTo = (activity: Activity) => {
    setDetailsActivityId(activity.activityId);
    setShowDetailsPopup(true);
  };

  // Handle adding activity success
  const handleAddActivitySuccess = () => {
    setShowAddActivityModal(false);
    
    // Refresh the weekly plan data
    fetchWeeklyPlan();
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

  // When user selects a day from weekly view
  const handleDaySelect = (day: DayInfo) => {
    if (onSelectDay) {
      onSelectDay(day.date);
    } else {
      setSelectedDay(day.dayName);
    }
  };

  // Calculate area progress
  const calculateAreaProgress = async () => {
    try {
      const progressQuery = query(
        collection(db, 'progressRecords'),
        where('childId', '==', childId),
        where('date', '>=', startOfWeek(currentWeek, { weekStartsOn: 1 }))
      );
      
      const progressSnapshot = await getDocs(progressQuery);
      const areaCounts: Record<string, number> = {};
      const totalActivities: Record<string, number> = {};
      
      // Count completed activities by area
      progressSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.area) {
          areaCounts[data.area] = (areaCounts[data.area] || 0) + 1;
        }
      });
      
      // Count total activities by area from weekly plan
      Object.values(weekActivities).forEach(dayActivities => {
        dayActivities.forEach(activity => {
          if (activity.area) {
            totalActivities[activity.area] = (totalActivities[activity.area] || 0) + 1;
          }
        });
      });
      
      // Calculate progress percentage for each area
      const progress: Record<string, number> = {};
      Object.keys(totalActivities).forEach(area => {
        progress[area] = totalActivities[area] > 0 
          ? Math.round((areaCounts[area] || 0) / totalActivities[area] * 100)
          : 0;
      });
      
      setAreaProgress(progress);
    } catch (error) {
      console.error('Error calculating area progress:', error);
    }
  };

  // Update area progress when activities change
  useEffect(() => {
    if (weekActivities && Object.keys(weekActivities).length > 0) {
      calculateAreaProgress();
    }
  }, [weekActivities, childId, currentWeek]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading weekly plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">Weekly Plan</h2>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={handlePrevWeek}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Previous week"
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="w-48 text-center mx-1 font-medium">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </div>
          
          <button
            onClick={handleNextWeek}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Next week"
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Controls */}
      <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          {onBackToDaily && (
            <button
              onClick={onBackToDaily}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              type="button"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Daily View
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddActivityModal(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            type="button"
          >
            <Plus className="-ml-1 mr-1 h-4 w-4" />
            Add Activity
          </button>
        </div>
      </div>
      
      {/* Week content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {/* Weekly Summary */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Weekly Overview for {childName}</h3>
            <span className="text-sm text-gray-500">
              Week of {format(weekStart, 'MMM d, yyyy')}
            </span>
          </div>
          
          {/* Progress stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-gray-200 bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-1">Total Activities</div>
              <div className="text-xl font-medium">
                {weekStats.totalActivities}
              </div>
            </div>
            
            <div className="border border-gray-200 bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-1">Completed</div>
              <div className="flex items-baseline">
                <span className="text-xl font-medium text-green-600">
                  {weekStats.completedActivities}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  ({weekStats.percentComplete}%)
                </span>
              </div>
            </div>

            <div className="border border-gray-200 bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-1">Areas Covered</div>
              <div className="flex flex-wrap gap-1">
                {weekStats.uniqueAreas.map((area, index) => (
                  <span 
                    key={index}
                    className={`text-xs px-2 py-0.5 rounded-full ${getAreaColor(area)}`}
                  >
                    {area.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-1">School Connection</div>
              <div className="text-xl font-medium text-indigo-600">
                {Object.values(weekActivities).reduce((sum, activities) => 
                  sum + activities.filter(a => a.isHomeSchoolConnection).length, 0
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">Activities</div>
            </div>
          </div>

          {/* Developmental Progress */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Developmental Progress</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Activity Engagement</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {Math.round((weekStats.completedActivities / weekStats.totalActivities) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${(weekStats.completedActivities / weekStats.totalActivities) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Areas Balance</span>
                  <span className="text-sm font-medium text-blue-600">
                    {weekStats.uniqueAreas.length}/7
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(weekStats.uniqueAreas.length / 7) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Area Progress Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Area Progress This Week</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(areaProgress).map(([area, progress]) => (
              <div key={area} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {area.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-medium text-emerald-600">
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getAreaColor(area)}`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Days of the week - vertical layout */}
        <div className="space-y-6">
          {weekDays.map((day) => (
            <div 
              key={day.date.toISOString()}
              className={`border rounded-lg overflow-hidden ${
                day.isToday ? 'border-emerald-300' : 'border-gray-200'
              } ${selectedDay === day.dayName ? 'ring-2 ring-emerald-500' : ''}
              ${selectedDate && isSameDay(day.date, selectedDate) ? 'bg-emerald-50 border-emerald-300' : ''}
              ${onSelectDay ? 'cursor-pointer hover:border-emerald-300 transition-colors' : ''}`}
              onClick={() => onSelectDay && onSelectDay(day.date)}
            >
              {/* Day header */}
              <div className={`px-4 py-3 flex justify-between items-center ${
                day.isToday ? 'bg-emerald-50' : 'bg-gray-50'
              } ${selectedDate && isSameDay(day.date, selectedDate) ? 'bg-emerald-100' : ''}`}>
                <div className="flex items-center">
                  <span className={`font-medium ${
                    day.isToday ? 'text-emerald-700' : 'text-gray-700'
                  }`}>
                    {day.dayName}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {format(day.date, 'MMM d')}
                  </span>
                  {day.isToday && (
                    <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                      Today
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {weekActivities[day.dayName]?.filter(a => a.status === 'completed').length || 0}/
                  {weekActivities[day.dayName]?.length || 0} completed
                </div>
              </div>
              
              {/* Activities for the day */}
              <div className="divide-y divide-gray-100">
                {weekActivities[day.dayName] && weekActivities[day.dayName].length > 0 ? (
                  weekActivities[day.dayName].map(activity => (
                    <div 
                      key={activity.id} 
                      className={`p-4 ${
                        activity.status === 'completed' ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{activity.title}</h3>
                          {activity.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{activity.description}</p>
                          )}
                        </div>
                        
                        {activity.status === 'completed' && (
                          <span className="flex items-center text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {activity.lastObservedDate ? (
                              <>Last observed: {formatObservedDate(activity.lastObservedDate)}</>
                            ) : (
                              <>Observed</>
                            )}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500 space-x-3 mt-2">
                        {activity.area && (
                          <span className={`px-2 py-0.5 rounded-full ${getAreaColor(activity.area)}`}>
                            {activity.area.replace('_', ' ')}
                          </span>
                        )}
                        
                        {activity.duration && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {activity.duration} min
                          </span>
                        )}
                        
                        {activity.isHomeSchoolConnection && (
                          <span className="flex items-center text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                            <Star className="h-3 w-3 mr-1" />
                            School Connection
                          </span>
                        )}
                        
                        {activity.timeSlot && (
                          <span className="capitalize">
                            {activity.timeSlot}
                          </span>
                        )}
                      </div>

                      {/* Developmental Context */}
                      <div className="mt-3 bg-blue-50 rounded-md p-3">
                        <div className="flex items-center text-blue-700 mb-2">
                          <Info className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Learning Objectives</span>
                        </div>
                        <div className="text-sm text-blue-600 space-y-1">
                          {activity.area === 'practical_life' && (
                            <p>• Develops independence and self-care skills</p>
                          )}
                          {activity.area === 'sensorial' && (
                            <p>• Enhances sensory perception and discrimination</p>
                          )}
                          {activity.area === 'language' && (
                            <p>• Builds vocabulary and communication skills</p>
                          )}
                          {activity.area === 'mathematics' && (
                            <p>• Strengthens numerical understanding and problem-solving</p>
                          )}
                          {activity.area === 'cultural' && (
                            <p>• Expands knowledge of world cultures and sciences</p>
                          )}
                          {activity.area === 'science' && (
                            <p>• Fosters scientific thinking and observation skills</p>
                          )}
                          {activity.area === 'art' && (
                            <p>• Promotes creative expression and fine motor skills</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 px-3 py-2 mt-3 flex space-x-4 rounded-md">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHowTo(activity);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                          type="button"
                        >
                          <Info className="h-3 w-3 mr-1" />
                          How To
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddObservation(activity);
                          }}
                          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center"
                          type="button"
                        >
                          <PlusCircle className="h-3 w-3 mr-1" />
                          {activity.status === 'completed' ? 'Add Another Observation' : 'Add Observation'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <p>No activities planned for {day.dayName}.</p>
                    <button
                      onClick={() => setShowAddActivityModal(true)}
                      className="mt-2 text-sm text-emerald-600 hover:text-emerald-700"
                      type="button"
                    >
                      Add an activity
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
      
      {/* Quick Observation Form */}
      {showQuickObservation && observationActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <QuickObservationForm
              activityId={observationActivity.activityId}
              childId={childId}
              activityTitle={observationActivity.title}
              weeklyPlanId={weekPlanId || undefined}
              dayOfWeek={selectedDay || undefined}
              onSuccess={handleObservationSuccess}
              onClose={() => setShowQuickObservation(false)}
            />
          </div>
        </div>
      )}
      
      {/* Add Activity Modal */}
      {showAddActivityModal && weekPlanId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <AddActivityToWeeklyPlan
              weeklyPlanId={weekPlanId}
              childId={childId}
              onSuccess={handleAddActivitySuccess}
              onClose={() => setShowAddActivityModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}