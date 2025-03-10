import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  CheckCircle,
  Star,
  Loader2,
  EyeOff,
  Eye
} from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  Timestamp, 
  getDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

// Define types
interface DayInfo {
  date: Date;
  dayName: string;
  dayShort: string;
  dayNumber: string;
  isToday: boolean;
}

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
}

interface WeekActivities {
  [key: string]: Activity[];
}

interface SimplifiedWeeklyViewProps {
  childId: string;
  childName: string;
}

const SimplifiedWeeklyView: React.FC<SimplifiedWeeklyViewProps> = (props) => {
  const { childId, childName } = props;
  
  // New state to toggle between simple and detailed views
  const [showDetailedView, setShowDetailedView] = useState<boolean>(false);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [weekActivities, setWeekActivities] = useState<WeekActivities>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDay, setActiveDay] = useState<string>(format(new Date(), 'EEEE'));
  const [weekPlanId, setWeekPlanId] = useState<string | null>(null);
  
  // Use a ref to track if we've already fetched for this week's date
  // This prevents infinite loop of fetching when no plan exists
  const fetchedWeeks = useRef<Set<string>>(new Set());
  
  // Calculate dates for week view
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
  const weekStartKey = format(weekStart, 'yyyy-MM-dd');
  
  const weekDays: DayInfo[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      dayName: format(date, 'EEEE'),
      dayShort: format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    };
  });
  
  // Fetch weekly plan and activities from Firebase
  useEffect(() => {
    const fetchWeeklyPlan = async () => {
      // Only fetch if we haven't already fetched for this week
      if (fetchedWeeks.current.has(weekStartKey)) {
        return;
      }
      
      try {
        setLoading(true);
        fetchedWeeks.current.add(weekStartKey);
        
        // Format date for query
        const weekStartDate = weekStartKey;
        
        // Query for the weekly plan for this child and week
        const plansQuery = query(
          collection(db, 'weeklyPlans'),
          where('childId', '==', childId),
          where('weekStarting', '==', weekStartDate)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        
        // If no plan exists, create an empty structure
        if (plansSnapshot.empty) {
          console.log('No weekly plan found for this week');
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
        const planData = planDoc.data();
        const planId = planDoc.id;
        setWeekPlanId(planId);
        
        // Create a structure to hold activities by day
        const weekActivitiesData: WeekActivities = {};
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        // Initialize each day
        for (const dayName of dayNames) {
          const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          weekActivitiesData[formattedDayName] = [];
        }
        
        // Get activities for each day
        const activitiesPromises = dayNames.map(async (dayName) => {
          const dayActivities = planData[dayName] || [];
          const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          
          if (dayActivities.length > 0) {
            // Fetch activity details for each activity ID
            const activitiesWithDetails = await Promise.all(
              dayActivities.map(async (activity: any) => {
                try {
                  const activityDoc = await getDoc(doc(db, 'activities', activity.activityId));
                  
                  if (activityDoc.exists()) {
                    const activityData = activityDoc.data();
                    return {
                      id: `${planId}_${dayName}_${activity.activityId}`,
                      activityId: activity.activityId,
                      title: activityData.title || 'Untitled Activity',
                      area: activityData.area || '',
                      duration: activityData.duration || 15,
                      isHomeSchoolConnection: activityData.environmentType === 'bridge' || 
                                             !!activityData.classroomExtension,
                      status: activity.status,
                      timeSlot: activity.timeSlot,
                      order: activity.order
                    };
                  }
                  
                  // If activity not found, still return the basic info
                  return {
                    id: `${planId}_${dayName}_${activity.activityId}`,
                    activityId: activity.activityId,
                    title: 'Unknown Activity',
                    status: activity.status,
                    timeSlot: activity.timeSlot,
                    order: activity.order
                  };
                } catch (error) {
                  console.error(`Error fetching activity ${activity.activityId}:`, error);
                  return {
                    id: `${planId}_${dayName}_${activity.activityId}`,
                    activityId: activity.activityId,
                    title: 'Error Loading Activity',
                    status: activity.status
                  };
                }
              })
            );
            
            weekActivitiesData[formattedDayName] = activitiesWithDetails.sort((a, b) => 
              (a.order || 0) - (b.order || 0)
            );
          }
        });
        
        await Promise.all(activitiesPromises);
        setWeekActivities(weekActivitiesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching weekly plan:', error);
        setLoading(false);
      }
    };
    
    if (childId) {
      fetchWeeklyPlan();
    }
  }, [childId, weekStartKey]);
  
  // Get the start of the week (Monday) for a given date
  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
  }

  // Format date for display
  function formatDisplayDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Navigate to previous week
  function previousWeek(): void {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeek(prevWeek);
  }

  // Navigate to next week
  function nextWeek(): void {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  }

  // Mark activity complete
  async function markActivityComplete(activityId: string, dayName: string): Promise<void> {
    if (!weekPlanId) {
      console.error("No weekly plan ID available");
      return;
    }
    
    try {
      // Update local state first for instant feedback
      setWeekActivities(prev => {
        const newActivities = {...prev};
        
        if (newActivities[activeDay]) {
          newActivities[activeDay] = newActivities[activeDay].map(activity => 
            activity.activityId === activityId ? {...activity, status: 'completed'} : activity
          );
        }
        
        return newActivities;
      });
      
      // Update in Firebase
      const planRef = doc(db, 'weeklyPlans', weekPlanId);
      
      // Get the current plan data
      const planDoc = await getDoc(planRef);
      if (!planDoc.exists()) {
        throw new Error('Weekly plan not found');
      }
      
      const planData = planDoc.data();
      
      // Format day name to match Firebase field (lowercase)
      const lowercaseDayName = dayName.toLowerCase();
      
      // Find and update the activity
      const dayActivities = planData[lowercaseDayName] || [];
      const updatedDayActivities = dayActivities.map((activity: any) => 
        activity.activityId === activityId ? 
          {...activity, status: 'completed'} : 
          activity
      );
      
      // Update the day's activities in Firebase
      await updateDoc(planRef, {
        [lowercaseDayName]: updatedDayActivities,
        updatedAt: serverTimestamp()
      });
      
      // Create progress record for this completed activity
      await createProgressRecord(activityId);
      
      console.log(`Activity ${activityId} marked as completed`);
    } catch (error) {
      console.error('Error marking activity as complete:', error);
    }
  }
  
  const createProgressRecord = async (activityId: string): Promise<void> => {
    try {
      // Add a new progress record in Firebase
      const progressData = {
        childId,
        activityId,
        date: new Date(),
        completionStatus: 'completed',
        engagementLevel: 'medium', // Default value
        interestLevel: 'medium', // Default value
        completionDifficulty: 'appropriate', // Default value
        notes: '',
        skillsDemonstrated: [], // Would be populated in the detailed observation
        environmentContext: 'home',
        observationType: 'general',
        visibility: ['all'], // Visible to all
        weeklyPlanId: weekPlanId,
        dayOfWeek: activeDay.toLowerCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Use your existing addProgressRecord function or directly add to Firebase
      await addDoc(collection(db, 'progressRecords'), progressData);
      
      console.log('Progress record created for activity:', activityId);
    } catch (error) {
      console.error('Error creating progress record:', error);
    }
  };
  
  // Get area color class for an activity
  function getAreaColorClass(area?: string): string {
    switch(area) {
      case 'practical_life': return 'bg-blue-100 text-blue-700';
      case 'sensorial': return 'bg-purple-100 text-purple-700';
      case 'language': return 'bg-green-100 text-green-700';
      case 'mathematics': return 'bg-red-100 text-red-700';
      case 'cultural': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
  
  // Calculate week's activity completion rate
  const calculateCompletionRate = () => {
    let total = 0;
    let completed = 0;
    
    Object.values(weekActivities).forEach(dayActivities => {
      total += dayActivities.length;
      completed += dayActivities.filter(a => a.status === 'completed').length;
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };
  
  // Toggle between simple and detailed views
  const toggleDetailView = () => {
    setShowDetailedView(!showDetailedView);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">Weekly Activities</h2>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={toggleDetailView}
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center"
          >
            {showDetailedView ? 
              <><EyeOff className="h-3 w-3 mr-1" />Simple View</> : 
              <><Eye className="h-3 w-3 mr-1" />Detailed View</>
            }
          </button>
          <div className="flex items-center">
            <button 
              onClick={previousWeek}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-sm flex items-center mx-2">
              <span>{format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}</span>
            </div>
            <button 
              onClick={nextWeek}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Next week"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Simple View (default) */}
            {!showDetailedView ? (
              <>
                {/* Simple day cards with activity counts */}
                <div className="grid grid-cols-7 gap-2 mb-6">
                  {weekDays.map((day) => (
                    <div key={day.dayName} className="flex flex-col">
                      {/* Day header */}
                      <div 
                        className={`flex flex-col items-center p-2 rounded-t-lg ${
                          day.isToday 
                            ? 'bg-blue-100 text-blue-800' 
                            : activeDay === day.dayName
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-xs font-medium">{day.dayShort}</span>
                        <span className="text-lg font-bold">{day.dayNumber}</span>
                      </div>
                      
                      {/* Activity count */}
                      <Link 
                        href={`/dashboard/children/${childId}?date=${format(day.date, 'yyyy-MM-dd')}`}
                        className="bg-white border-x border-b border-gray-200 p-2 rounded-b-lg h-14 flex flex-col items-center justify-center hover:bg-gray-50"
                      >
                        {weekActivities[day.dayName] && weekActivities[day.dayName].length > 0 ? (
                          <>
                            <span className="text-sm font-semibold text-gray-800">
                              {weekActivities[day.dayName].length}
                            </span>
                            <span className="text-xs text-gray-500">
                              {weekActivities[day.dayName].length === 1 ? 'Activity' : 'Activities'}
                            </span>
                            {weekActivities[day.dayName].some(a => a.status === 'completed') && (
                              <div className="mt-1 flex items-center text-green-600 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <span>
                                  {weekActivities[day.dayName].filter(a => a.status === 'completed').length}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">No activities</span>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
                
                {/* Weekly progress summary */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-700 mb-3">Weekly Progress</h3>
                  <div className="flex items-center mb-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-emerald-500 h-2.5 rounded-full" 
                        style={{ width: `${calculateCompletionRate()}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {calculateCompletionRate()}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Complete activities to track progress
                  </p>
                  
                  <div className="mt-4 flex justify-center">
                    <Link 
                      href={`/dashboard/children/${childId}/weekly-plan?view=detailed`}
                      className="text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      View Full Weekly Plan
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              // Detailed View
              <div className="grid grid-cols-7 gap-4 min-w-max overflow-x-auto">
                {weekDays.map((day) => (
                  <div key={day.dayName} className="border rounded-lg overflow-hidden w-48">
                    <div className={`px-3 py-2 border-b ${
                      day.isToday ? 'bg-blue-50 text-blue-700' : 'bg-gray-50'
                    }`}>
                      <h4 className="font-medium">{day.dayShort}, {day.dayNumber}</h4>
                    </div>
                    <div className="p-2 h-64 overflow-y-auto">
                      {weekActivities[day.dayName] && weekActivities[day.dayName].length > 0 ? (
                        <div className="space-y-2">
                          {weekActivities[day.dayName].map(activity => (
                            <div 
                              key={activity.id}
                              className={`border rounded-lg p-2 ${
                                activity.status === 'completed' 
                                  ? 'border-green-300 bg-green-50' 
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h5 className="text-sm font-medium line-clamp-1">{activity.title}</h5>
                                {activity.status === 'completed' ? (
                                  <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                ) : (
                                  <span className="text-xs text-gray-500 capitalize">
                                    {activity.timeSlot}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-1 mt-1 text-xs">
                                {activity.area && (
                                  <span className={`px-1.5 py-0.5 rounded-full ${getAreaColorClass(activity.area)}`}>
                                    {activity.area.replace('_', ' ')}
                                  </span>
                                )}
                                
                                {activity.duration && (
                                  <span className="flex items-center text-gray-500">
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                    {activity.duration}min
                                  </span>
                                )}
                              </div>
                              
                              {activity.status !== 'completed' && (
                                <div className="mt-1 pt-1 border-t border-gray-100">
                                  <button
                                    onClick={() => markActivityComplete(activity.activityId, day.dayName)}
                                    className="text-xs text-emerald-600 hover:text-emerald-700"
                                  >
                                    Mark Complete
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-xs text-gray-400">No activities</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SimplifiedWeeklyView;