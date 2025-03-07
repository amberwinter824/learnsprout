// app/components/WeeklyPlanView.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal,
  FileText,
  BookOpen,
  ClipboardEdit,
  RefreshCw
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ActivityDetailModal from '@/app/components/ActivityDetailModal';
import ActivityCard from '@/app/components/ActivityCard';

interface WeeklyPlanViewProps {
  childId: string;
  weeklyPlanId: string;
  userId: string;
}

interface DayActivity {
  activityId: string;
  timeSlot: string;
  status: 'suggested' | 'confirmed' | 'completed';
  order: number;
  suggestionId?: string;
}

interface WeeklyPlan {
  id: string;
  childId: string;
  userId: string;
  weekStarting: any; // Timestamp
  createdBy: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  monday: DayActivity[];
  tuesday: DayActivity[];
  wednesday: DayActivity[];
  thursday: DayActivity[];
  friday: DayActivity[];
  saturday: DayActivity[];
  sunday: DayActivity[];
}

interface ActivityData {
  id: string;
  title: string;
  area?: string;
  description?: string;
  duration?: number;
  difficulty?: string;
  [key: string]: any;
}

export default function WeeklyPlanView({ childId, weeklyPlanId, userId }: WeeklyPlanViewProps) {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [activities, setActivities] = useState<Record<string, ActivityData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<{ activityId: string; day: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0); // Added a refresh key for forcing updates
  
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  // Fetch weekly plan data
  const fetchWeeklyPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching weekly plan:', weeklyPlanId);
      
      // Get the weekly plan
      const planRef = doc(db, 'weeklyPlans', weeklyPlanId);
      const planSnapshot = await getDoc(planRef);
      
      if (!planSnapshot.exists()) {
        setError('Weekly plan not found');
        setLoading(false);
        return;
      }
      
      const planData = {
        id: planSnapshot.id,
        ...planSnapshot.data()
      } as WeeklyPlan;
      
      console.log('Weekly plan data fetched:', planData);
      setWeeklyPlan(planData);
      
      // Get all activity IDs from the weekly plan
      const activityIds = new Set<string>();
      
      daysOfWeek.forEach(day => {
        const dayActivities = planData[day as keyof WeeklyPlan] as DayActivity[];
        if (dayActivities) {
          dayActivities.forEach(activity => {
            if (activity.activityId) {
              activityIds.add(activity.activityId);
            }
          });
        }
      });
      
      console.log('Activity IDs to fetch:', activityIds.size);
      
      // Fetch activity details for all IDs
      const activityPromises = Array.from(activityIds).map(async (activityId) => {
        const activityRef = doc(db, 'activities', activityId);
        const activitySnapshot = await getDoc(activityRef);
        
        if (activitySnapshot.exists()) {
          return {
            id: activitySnapshot.id,
            ...activitySnapshot.data()
          } as ActivityData;
        }
        
        return null;
      });
      
      const activityResults = await Promise.all(activityPromises);
      const activityMap: Record<string, ActivityData> = {};
      
      activityResults.forEach(activity => {
        if (activity) {
          activityMap[activity.id] = activity;
        }
      });
      
      console.log('Activities fetched:', Object.keys(activityMap).length);
      setActivities(activityMap);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching weekly plan:', err);
      setError('Failed to load weekly plan');
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    if (weeklyPlanId) {
      fetchWeeklyPlan();
    }
  }, [weeklyPlanId, childId, userId, refreshKey]);
  
  // Listen for activity status change events
  useEffect(() => {
    const handleActivityStatusChange = () => {
      if (weeklyPlanId) {
        console.log('Activity status changed, refreshing weekly plan');
        fetchWeeklyPlan();
      }
    };
    
    // Add event listener
    window.addEventListener('activity-status-changed', handleActivityStatusChange);
    
    // Clean up
    return () => {
      window.removeEventListener('activity-status-changed', handleActivityStatusChange);
    };
  }, [weeklyPlanId]);
  
  const getDayLabel = (day: string, index: number) => {
    if (!weeklyPlan || !weeklyPlan.weekStarting) return day;
    
    // Adjust for time zone issues by creating a date directly
    const weekStart = weeklyPlan.weekStarting.toDate ? 
      weeklyPlan.weekStarting.toDate() : 
      new Date(weeklyPlan.weekStarting);
    
    // Ensure we start with Monday (0 = Monday in our array)
    const date = addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), index);
    
    return format(date, 'EEE, MMM d');
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'suggested':
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };
  
  const getAreaColor = (area?: string) => {
    const areaColors: Record<string, string> = {
      'practical_life': 'border-pink-200 bg-pink-50',
      'sensorial': 'border-purple-200 bg-purple-50',
      'language': 'border-blue-200 bg-blue-50',
      'mathematics': 'border-green-200 bg-green-50',
      'cultural': 'border-yellow-200 bg-yellow-50',
      'science': 'border-teal-200 bg-teal-50',
      'art': 'border-indigo-200 bg-indigo-50'
    };
    
    return area && areaColors[area] ? areaColors[area] : 'border-gray-200 bg-gray-50';
  };
  
  const handleActivityClick = (activityId: string, day: string) => {
    setSelectedActivity({ activityId, day });
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };
  
  const handleObservationRecorded = async () => {
    console.log('Observation recorded, refreshing weekly plan');
    
    // Force a complete refresh by incrementing refresh key
    setRefreshKey(prevKey => prevKey + 1);
    
    // Directly fetch the weekly plan again to update activity statuses
    await fetchWeeklyPlan();
  };
  
  const handleManualRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="ml-2 text-gray-600">Loading weekly plan...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-start">
        <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }
  
  if (!weeklyPlan) {
    return (
      <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md">
        <p>No weekly plan found for this child.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">
            Weekly Plan for {format(weeklyPlan.weekStarting.toDate(), 'MMMM d, yyyy')}
          </h2>
        </div>
        <button 
          onClick={handleManualRefresh}
          className="text-emerald-600 hover:text-emerald-700 flex items-center text-sm"
          title="Refresh plan"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {daysOfWeek.map((day, index) => {
            const dayActivities = weeklyPlan[day as keyof WeeklyPlan] as DayActivity[];
            
            return (
              <div 
                key={day} 
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-sm text-gray-700">
                    {getDayLabel(day, index)}
                  </h3>
                </div>
                
                <div className="p-3 space-y-3 min-h-40">
                  {dayActivities && dayActivities.length > 0 ? (
                    dayActivities
                      .sort((a, b) => a.order - b.order)
                      .map((activity) => {
                        const activityData = activities[activity.activityId];
                        
                        return (
                          <ActivityCard
                            key={`${day}-${activity.activityId}-${activity.order}-${activity.status}`}
                            activity={activity}
                            activityData={activityData}
                            day={day}
                            childId={childId}
                            onStatusChange={handleObservationRecorded}
                          />
                        );
                      })
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-400 italic">No activities</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Activity Detail Modal */}
      {isModalOpen && selectedActivity && (
        <ActivityDetailModal
          activityId={selectedActivity.activityId}
          childId={childId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onObservationRecorded={handleObservationRecorded}
          weeklyPlanId={weeklyPlanId}
          dayOfWeek={selectedActivity.day}
        />
      )}
    </div>
  );
}