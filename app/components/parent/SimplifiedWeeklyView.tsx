import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  CheckCircle,
  Star,
  Loader2
} from 'lucide-react';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  Timestamp, 
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [weekActivities, setWeekActivities] = useState<WeekActivities>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDay, setActiveDay] = useState<string>(format(new Date(), 'EEEE'));
  const [weekPlanId, setWeekPlanId] = useState<string | null>(null);
  
  // Calculate dates for week view
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
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
      try {
        setLoading(true);
        
        // Format date for query
        const weekStartDate = format(weekStart, 'yyyy-MM-dd');
        
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
  }, [childId, weekStart]);
  
  const getAreaColor = (area?: string): string => {
    const areaColors: Record<string, string> = {
      'practical_life': 'bg-pink-100 text-pink-800',
      'sensorial': 'bg-purple-100 text-purple-800',
      'language': 'bg-blue-100 text-blue-800',
      'mathematics': 'bg-green-100 text-green-800',
      'cultural': 'bg-yellow-100 text-yellow-800'
    };
    return area && areaColors[area] ? areaColors[area] : 'bg-gray-100 text-gray-800';
  };
  
  const handlePrevWeek = (): void => {
    setCurrentWeek(prev => addDays(prev, -7));
  };
  
  const handleNextWeek = (): void => {
    setCurrentWeek(prev => addDays(prev, 7));
  };
  
  const handleDaySelect = (dayName: string): void => {
    setActiveDay(dayName);
  };
  
  const markActivityComplete = async (activityId: string, dayName: string): Promise<void> => {
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
      
      // Revert the optimistic update if there was an error
      // Reload the current data
      const weekStartDate = format(weekStart, 'yyyy-MM-dd');
      const plansQuery = query(
        collection(db, 'weeklyPlans'),
        where('childId', '==', childId),
        where('weekStarting', '==', weekStartDate)
      );
      
      const plansSnapshot = await getDocs(plansQuery);
      if (!plansSnapshot.empty) {
        const planDoc = plansSnapshot.docs[0];
        const planData = planDoc.data();
        
        // Reapply the data to the state
        const updatedWeekActivities = {...weekActivities};
        const lowercaseDayName = activeDay.toLowerCase();
        const dayActivities = planData[lowercaseDayName] || [];
        
        // Update just this day's activities
        if (dayActivities.length > 0) {
          const updatedDayActivities = await Promise.all(
            dayActivities.map(async (activity: any) => {
              try {
                const activityDoc = await getDoc(doc(db, 'activities', activity.activityId));
                if (activityDoc.exists()) {
                  const activityData = activityDoc.data();
                  return {
                    id: `${weekPlanId}_${lowercaseDayName}_${activity.activityId}`,
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
                
                return {
                  id: `${weekPlanId}_${lowercaseDayName}_${activity.activityId}`,
                  activityId: activity.activityId,
                  title: 'Unknown Activity',
                  status: activity.status
                };
              } catch (err) {
                console.error(`Error fetching activity ${activity.activityId}:`, err);
                return {
                  id: `${weekPlanId}_${lowercaseDayName}_${activity.activityId}`,
                  activityId: activity.activityId,
                  title: 'Error Loading Activity',
                  status: activity.status
                };
              }
            })
          );
          
          updatedWeekActivities[activeDay] = updatedDayActivities;
          setWeekActivities(updatedWeekActivities);
        }
      }
    }
  };
  
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
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'progressRecords'), progressData);
      
      console.log('Progress record created for activity:', activityId);
    } catch (error) {
      console.error('Error creating progress record:', error);
    }
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
            onClick={handlePrevWeek}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Previous week"
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-sm flex items-center">
            <span>{format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}</span>
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
      
      {/* Day selector */}
      <div className="px-4 py-2 border-b border-gray-200 overflow-x-auto">
        <div className="flex space-x-1">
          {weekDays.map(day => (
            <button
              key={day.dayName}
              onClick={() => handleDaySelect(day.dayName)}
              className={`flex flex-col items-center px-3 py-2 rounded-lg ${
                activeDay === day.dayName 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : day.isToday
                    ? 'bg-blue-50 text-blue-800'
                    : 'hover:bg-gray-100'
              }`}
              type="button"
            >
              <span className="text-xs">{day.dayShort}</span>
              <span className={`text-lg font-medium ${day.isToday ? 'text-blue-600' : ''}`}>
                {day.dayNumber}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            <h3 className="font-medium mb-3">{activeDay}'s Activities</h3>
            
            {weekActivities[activeDay] && weekActivities[activeDay].length > 0 ? (
              <div className="space-y-3">
                {weekActivities[activeDay].map(activity => (
                  <div 
                    key={activity.id}
                    className={`border rounded-lg p-3 ${
                      activity.status === 'completed' 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{activity.title}</h4>
                      
                      {activity.status === 'completed' ? (
                        <div className="flex items-center text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => markActivityComplete(activity.activityId, activeDay)}
                          className="text-sm bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2 py-1 rounded"
                          type="button"
                        >
                          <span>Mark Complete</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      {activity.area && (
                        <span className={`px-2 py-0.5 rounded-full ${getAreaColor(activity.area)}`}>
                          {activity.area.replace('_', ' ')}
                        </span>
                      )}
                      
                      {activity.duration && (
                        <span className="flex items-center text-gray-500 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{activity.duration} min</span>
                        </span>
                      )}
                      
                      {activity.isHomeSchoolConnection && (
                        <span className="flex items-center text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                          <Star className="h-3 w-3 mr-1" />
                          <span>School Connection</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No activities planned for {activeDay}.</p>
                <button 
                  className="mt-2 text-sm text-emerald-600 hover:text-emerald-700"
                  type="button"
                >
                  <span>Add Activity</span>
                </button>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Activity Summary</h3>
                <div className="text-sm text-gray-500">
                  <span>Week of {format(weekStart, 'MMM d')}</span>
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Total Activities</div>
                  <div className="text-xl font-medium">
                    {Object.values(weekActivities).reduce((sum, day) => sum + day.length, 0)}
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Completed</div>
                  <div className="text-xl font-medium text-green-600">
                    {Object.values(weekActivities).reduce((sum, day) => 
                      sum + day.filter(a => a.status === 'completed').length, 0
                    )}
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-3 col-span-2">
                  <div className="text-sm text-gray-500 mb-1">Areas Covered</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.from(new Set(
                      Object.values(weekActivities)
                        .flat()
                        .map(activity => activity.area)
                        .filter(Boolean) // Remove undefined/null values
                    )).map(area => (
                      <span 
                        key={area} 
                        className={`text-xs px-2 py-0.5 rounded-full ${getAreaColor(area)}`}
                      >
                        {area?.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SimplifiedWeeklyView;