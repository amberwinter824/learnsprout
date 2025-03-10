// app/components/parent/WeekAtAGlanceView.tsx
'use client';

import { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
}

export default function WeekAtAGlanceView({ 
  childId, 
  childName,
  onSelectDay,
  onBackToDaily
}: WeekAtAGlanceViewProps) {
  const router = useRouter();
  
  // State
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [weekActivities, setWeekActivities] = useState<WeekActivities>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weekPlanId, setWeekPlanId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Calculate dates for week view
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
  const weekDays: DayInfo[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      dayName: format(date, 'EEEE'),
      dayShort: format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      isToday: isToday(date)
    };
  });
  
  // Fetch weekly plan data
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
        setError('Failed to load weekly plan');
        setLoading(false);
      }
    };
    
    if (childId) {
      fetchWeeklyPlan();
    }
  }, [childId, weekStart]);
  
  // Navigate to previous week
  const handlePrevWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };
  
  // Navigate to next week
  const handleNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };
  
  // Handle day selection
  const handleDaySelect = (day: DayInfo) => {
    setSelectedDay(day.dayName);
    
    if (onSelectDay) {
      onSelectDay(day.date);
    }
  };
  
  // Handle back to daily view
  const handleBackToDailyView = () => {
    if (onBackToDaily) {
      onBackToDaily();
    } else {
      router.push(`/dashboard/children/${childId}`);
    }
  };
  
  // Get color for activity area
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
          <button
            onClick={handleBackToDailyView}
            className="mr-2 text-gray-500 hover:text-gray-700"
            aria-label="Back to daily view"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">Weekly View</h2>
        </div>
        
        <div className="flex items-center">
          <button 
            onClick={handlePrevWeek}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <span className="mx-2 text-sm font-medium">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
          </span>
          
          <button 
            onClick={handleNextWeek}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Week grid */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-7 gap-2 mb-6">
          {weekDays.map((day) => (
            <div key={day.dayName} className="flex flex-col">
              {/* Day header */}
              <button
                onClick={() => handleDaySelect(day)}
                className={`flex flex-col items-center p-2 rounded-t-lg ${
                  day.isToday 
                    ? 'bg-blue-100 text-blue-800' 
                    : selectedDay === day.dayName
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="text-xs font-medium">{day.dayShort}</span>
                <span className="text-lg font-bold">{day.dayNumber}</span>
              </button>
              
              {/* Activity count */}
              <div className="bg-white border-x border-b border-gray-200 p-2 rounded-b-lg h-14 flex flex-col items-center justify-center">
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
              </div>
            </div>
          ))}
        </div>
        
        {/* Selected day activities or weekly summary */}
        {selectedDay ? (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-lg">{selectedDay}'s Activities</h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close day view"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {weekActivities[selectedDay] && weekActivities[selectedDay].length > 0 ? (
              <div className="space-y-3">
                {weekActivities[selectedDay].map(activity => (
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
                        <span className="flex items-center text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {activity.timeSlot === 'morning' ? 'Morning' : 
                           activity.timeSlot === 'afternoon' ? 'Afternoon' : 
                           'Anytime'}
                        </span>
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
              <div className="text-center py-6 text-gray-500">
                <p>No activities planned for {selectedDay}.</p>
              </div>
            )}
          </div>
        ) : (
          // Weekly Summary
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Weekly Summary</h3>
              <span className="text-sm text-gray-500">
                Week of {format(weekStart, 'MMM d, yyyy')}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">Total Activities</div>
                <div className="text-xl font-medium">{weekStats.totalActivities}</div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-3">
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
            </div>
            
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-2">Areas Covered</div>
              <div className="flex flex-wrap gap-1">
                {weekStats.uniqueAreas.map(area => (
                  <span 
                    key={area} 
                    className={`text-xs px-2 py-0.5 rounded-full ${getAreaColor(area)}`}
                  >
                    {area.replace('_', ' ')}
                  </span>
                ))}
                
                {weekStats.uniqueAreas.length === 0 && (
                  <span className="text-sm text-gray-500">No areas covered yet</span>
                )}
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 mb-2">
                Tap on any day above to see detailed activities
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}