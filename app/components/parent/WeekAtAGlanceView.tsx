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
  X,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import ActivityDetailModal from '@/app/components/ActivityDetailModal';
import QuickObservationForm from '@/app/components/parent/QuickObservationForm';

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
  
  // Activity detail modal state
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  
  // Quick observation form state
  const [showQuickObservation, setShowQuickObservation] = useState(false);
  const [observationActivity, setObservationActivity] = useState<Activity | null>(null);
  
  // Calculate week days for display
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i);
    return {
      date,
      dayName: format(date, 'EEEE'),
      dayShort: format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      isToday: isToday(date)
    };
  });

  // Calculate weekStart for data fetching
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });

  // Fetch weekly plan data
  useEffect(() => {
    const fetchWeeklyPlan = async () => {
      try {
        setLoading(true);
        
        // Format date for query - ensure it matches the format used when creating the plan
        const weekStartDate = format(weekStart, 'yyyy-MM-dd');
        console.log('Fetching weekly plan for date:', weekStartDate);
        console.log('Child ID:', childId);
        
        // First try to fetch by the plan ID format (childId_date)
        const planId = `${childId}_${weekStartDate}`;
        console.log('Looking for plan with ID:', planId);
        
        // Try to get the plan directly by ID first
        const planDocRef = doc(db, 'weeklyPlans', planId);
        const planDocSnap = await getDoc(planDocRef);
        
        let planData;
        let foundPlanId;
        
        if (planDocSnap.exists()) {
          console.log('Found plan by direct ID');
          planData = planDocSnap.data();
          foundPlanId = planDocSnap.id;
        } else {
          // If not found by ID, try the query approach
          console.log('Plan not found by ID, trying query...');
          const plansQuery = query(
            collection(db, 'weeklyPlans'),
            where('childId', '==', childId),
            where('weekStarting', '==', weekStartDate)
          );
          
          const plansSnapshot = await getDocs(plansQuery);
          
          if (plansSnapshot.empty) {
            console.log('No weekly plan found for this week via query either');
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
          console.log('Found plan via query with ID:', foundPlanId);
        }
        
        setWeekPlanId(foundPlanId);
        
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
          console.log(`Activities for ${dayName}:`, dayActivities);
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
                      id: `${foundPlanId}_${dayName}_${activity.activityId}`,
                      activityId: activity.activityId,
                      title: activityData.title || 'Untitled Activity',
                      area: activityData.area || '',
                      duration: activityData.duration || 15,
                      isHomeSchoolConnection: activityData.environmentType === 'bridge' || 
                                             !!activityData.classroomExtension,
                      status: activity.status,
                      timeSlot: activity.timeSlot,
                      order: activity.order,
                      description: activityData.description || ''
                    };
                  }
                  
                  // If activity not found, still return the basic info
                  return {
                    id: `${foundPlanId}_${dayName}_${activity.activityId}`,
                    activityId: activity.activityId,
                    title: 'Unknown Activity',
                    status: activity.status,
                    timeSlot: activity.timeSlot,
                    order: activity.order,
                    description: ''
                  };
                } catch (error) {
                  console.error(`Error fetching activity ${activity.activityId}:`, error);
                  return {
                    id: `${foundPlanId}_${dayName}_${activity.activityId}`,
                    activityId: activity.activityId,
                    title: 'Error Loading Activity',
                    status: activity.status,
                    description: ''
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
        console.log('Final week activities data:', weekActivitiesData);
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
  }, [childId, currentWeek]); // Only depend on childId and currentWeek
  
  // Navigate to previous week
  const handlePrevWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };
  
  // Navigate to next week
  const handleNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
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
  const handleObservationSuccess = () => {
    // Refresh activities after recording an observation
    const fetchActivities = async () => {
      // ... existing fetch code ...
    };
    
    if (childId) {
      fetchActivities();
    }
    
    setShowQuickObservation(false);
  };
  
  // Mark activity as completed
  const handleMarkCompleted = async (activity: Activity) => {
    // Implementation for marking activity as completed
    // This would update the activity status in Firestore
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
          <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">Weekly View</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrevWeek}
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <span className="mx-2 text-sm font-medium">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
          </span>
          
          <button 
            onClick={handleNextWeek}
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center"
          >
            <ChevronRight className="h-5 w-5" />
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
            <h3 className="font-medium">Weekly Overview</h3>
            <span className="text-sm text-gray-500">
              Week of {format(weekStart, 'MMM d, yyyy')}
            </span>
          </div>
          
          {/* Progress stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-gray-200 bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-1">Total Activities</div>
              <div className="text-xl font-medium">
                {Object.values(weekActivities).reduce((sum, day) => sum + day.length, 0)}
              </div>
            </div>
            
            <div className="border border-gray-200 bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-1">Completed</div>
              <div className="flex items-baseline">
                <span className="text-xl font-medium text-green-600">
                  {Object.values(weekActivities).reduce(
                    (sum, day) => sum + day.filter(a => a.status === 'completed').length, 0
                  )}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  ({Object.values(weekActivities).reduce((sum, day) => sum + day.length, 0) > 0 
                    ? Math.round((Object.values(weekActivities).reduce(
                        (sum, day) => sum + day.filter(a => a.status === 'completed').length, 0
                      ) / Object.values(weekActivities).reduce((sum, day) => sum + day.length, 0)) * 100) 
                    : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Days of the week - vertical layout */}
        <div className="space-y-6">
          {weekDays.map((day) => (
            <div key={day.dayName} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Day header */}
              <div className={`p-3 ${
                day.isToday ? 'bg-blue-100' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-center">
                  <h3 className={`font-medium ${day.isToday ? 'text-blue-800' : 'text-gray-800'}`}>
                    {day.dayName} <span className="font-bold">{day.dayNumber}</span>
                  </h3>
                  {day.isToday && (
                    <span className="text-xs font-medium bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
              </div>
              
              {/* Activities for the day */}
              <div className="divide-y divide-gray-100">
                {weekActivities[day.dayName] && weekActivities[day.dayName].length > 0 ? (
                  weekActivities[day.dayName].map(activity => (
                    <div 
                      key={activity.id} 
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        activity.status === 'completed' ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex flex-col space-y-3">
                        {/* Activity header */}
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-gray-900">{activity.title}</h4>
                          {activity.status === 'completed' ? (
                            <span className="flex items-center text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              <span>Completed</span>
                            </span>
                          ) : null}
                        </div>
                        
                        {/* Activity tags */}
                        <div className="flex flex-wrap gap-2">
                          {activity.area && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getAreaColor(activity.area)}`}>
                              {activity.area.replace('_', ' ')}
                            </span>
                          )}
                          
                          {activity.duration && (
                            <span className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3 mr-1" />
                              {activity.duration} min
                            </span>
                          )}
                          
                          {activity.timeSlot && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              activity.timeSlot === 'morning' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {activity.timeSlot === 'morning' ? 'Morning' : 'Afternoon'}
                            </span>
                          )}
                          
                          {activity.isHomeSchoolConnection && (
                            <span className="flex items-center text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                              <Star className="h-3 w-3 mr-1" />
                              School Connection
                            </span>
                          )}
                        </div>
                        
                        {/* Activity description - truncated */}
                        <div className="text-sm text-gray-600">
                          <p className="line-clamp-2">
                            {activity.description || "No description available for this activity."}
                          </p>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mt-1">
                          <button
                            onClick={() => handleActivitySelect(activity)}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md flex items-center"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </button>
                          
                          {activity.status !== 'completed' && (
                            <button
                              onClick={() => handleMarkCompleted(activity)}
                              className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md flex items-center"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Complete
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleAddObservation(activity)}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-md flex items-center"
                          >
                            <Camera className="h-3 w-3 mr-1" />
                            Add Observation
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <p>No activities planned for {day.dayName}.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Activity Detail Modal */}
      {showActivityDetail && selectedActivityId && (
        <ActivityDetailModal
          activityId={selectedActivityId}
          childId={childId}
          isOpen={showActivityDetail}
          onClose={() => setShowActivityDetail(false)}
          onObservationRecorded={() => {
            setShowActivityDetail(false);
            // Refresh activities after recording an observation
            const fetchActivities = async () => {
              // ... existing fetch code ...
            };
            
            if (childId) {
              fetchActivities();
            }
          }}
          weeklyPlanId={weekPlanId || undefined}
          dayOfWeek={selectedDay || undefined}
        />
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
    </div>
  );
}