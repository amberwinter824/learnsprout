"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  Camera, 
  Star, 
  ChevronRight,
  Loader2,
  BookOpen
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  Timestamp,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QuickObservationForm from './QuickObservationForm';
import { format } from 'date-fns';

// Define types for our component
interface Activity {
  id: string;
  activityId: string;
  title: string;
  description: string;
  duration?: number;
  area?: string;
  status: 'suggested' | 'confirmed' | 'completed';
  isHomeSchoolConnection?: boolean;
  timeSlot?: string;
  order?: number;
}

interface SimplifiedActivityDashboardProps {
  childId: string;
  childName: string;
  onActivitySelect?: (activityId: string, activityTitle: string) => void;
}

const SimplifiedActivityDashboard: React.FC<SimplifiedActivityDashboardProps> = ({ 
  childId, 
  childName,
  onActivitySelect 
}) => {
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showQuickObserve, setShowQuickObserve] = useState<boolean>(false);
  const [weeklyPlanId, setWeeklyPlanId] = useState<string | null>(null);

  // Fetch today's activities from Firebase
  useEffect(() => {
    const fetchTodayActivities = async () => {
      if (!childId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get today's date in the format used in the database (day of week lowercase)
        const today = new Date();
        const dayOfWeek = format(today, 'EEEE').toLowerCase();
        
        // Find the current week's plan
        const weekStartDate = new Date(today);
        const day = weekStartDate.getDay();
        const diff = weekStartDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust to get Monday
        weekStartDate.setDate(diff);
        weekStartDate.setHours(0, 0, 0, 0);
        
        const weekStartString = format(weekStartDate, 'yyyy-MM-dd');
        
        // Query for this week's plan
        const plansQuery = query(
          collection(db, 'weeklyPlans'),
          where('childId', '==', childId),
          where('weekStarting', '==', weekStartString)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        
        // Handle case where no plan exists for this week
        if (plansSnapshot.empty) {
          console.log('No weekly plan found for this week');
          setTodayActivities([]);
          setLoading(false);
          return;
        }
        
        // Use the first plan (should only be one per week)
        const planDoc = plansSnapshot.docs[0];
        const planData = planDoc.data();
        const planId = planDoc.id;
        
        setWeeklyPlanId(planId);
        
        // Get today's activities from the plan
        const dayActivities = planData[dayOfWeek] || [];
        
        if (dayActivities.length === 0) {
          setTodayActivities([]);
          setLoading(false);
          return;
        }
        
        // Fetch activity details for each activity ID
        const activitiesWithDetails = await Promise.all(
          dayActivities.map(async (activity: any) => {
            try {
              const activityDoc = await getDoc(doc(db, 'activities', activity.activityId));
              
              if (activityDoc.exists()) {
                const activityData = activityDoc.data();
                return {
                  id: `${planId}_${dayOfWeek}_${activity.activityId}`,
                  activityId: activity.activityId,
                  title: activityData.title || 'Untitled Activity',
                  description: activityData.description || '',
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
                id: `${planId}_${dayOfWeek}_${activity.activityId}`,
                activityId: activity.activityId,
                title: 'Unknown Activity',
                description: 'Activity details not found',
                status: activity.status,
                timeSlot: activity.timeSlot,
                order: activity.order
              };
            } catch (error) {
              console.error(`Error fetching activity ${activity.activityId}:`, error);
              return {
                id: `${planId}_${dayOfWeek}_${activity.activityId}`,
                activityId: activity.activityId,
                title: 'Error Loading Activity',
                description: 'Could not load activity details',
                status: activity.status
              };
            }
          })
        );
        
        // Sort activities by order
        const sortedActivities = activitiesWithDetails.sort((a, b) => 
          (a.order || 0) - (b.order || 0)
        );
        
        setTodayActivities(sortedActivities);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load today\'s activities');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodayActivities();
  }, [childId]);

  const handleActivitySelect = (activity: Activity): void => {
    setSelectedActivity(activity);
    
    // Call the parent component's onActivitySelect if provided
    if (onActivitySelect) {
      onActivitySelect(activity.activityId, activity.title);
    }
  };

  const markComplete = async (activityId: string): Promise<void> => {
    if (!weeklyPlanId) {
      console.error('No weekly plan ID available');
      return;
    }
    
    try {
      // Update local state first for instant feedback
      setTodayActivities(prev => 
        prev.map(act => 
          act.activityId === activityId ? {...act, status: 'completed'} : act
        )
      );
      
      // Find the activity to pass to parent component
      const activity = todayActivities.find(act => act.activityId === activityId);
      if (activity && onActivitySelect) {
        onActivitySelect(activity.activityId, activity.title);
      }
      
      // Set the selected activity for quick observation
      if (activity) {
        setSelectedActivity(activity);
        setShowQuickObserve(true);
      }
      
      // Update the activity status in Firestore
      const today = new Date();
      const dayOfWeek = format(today, 'EEEE').toLowerCase();
      
      const planRef = doc(db, 'weeklyPlans', weeklyPlanId);
      
      // Get the current plan data
      const planDoc = await getDoc(planRef);
      if (!planDoc.exists()) {
        throw new Error('Weekly plan not found');
      }
      
      const planData = planDoc.data();
      
      // Find and update the activity
      const dayActivities = planData[dayOfWeek] || [];
      const updatedDayActivities = dayActivities.map((activity: any) => 
        activity.activityId === activityId ? 
          {...activity, status: 'completed'} : 
          activity
      );
      
      // Update the day's activities in Firebase
      await updateDoc(planRef, {
        [dayOfWeek]: updatedDayActivities,
        updatedAt: serverTimestamp()
      });
      
      console.log(`Activity ${activityId} marked as completed`);
    } catch (error) {
      console.error('Error marking activity as complete:', error);
      
      // Revert the optimistic update
      setTodayActivities(prev => 
        prev.map(act => 
          act.activityId === activityId && act.status === 'completed'
            ? {...act, status: 'suggested'} 
            : act
        )
      );
      
      setError('Failed to mark activity as complete');
    }
  };

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

  const handleObservationComplete = () => {
    setShowQuickObserve(false);
    setSelectedActivity(null);
    
    // Refresh the activity list
    const fetchTodayActivities = async () => {
      // Implementation would be similar to the useEffect
      // But to avoid duplication, we'll just reload the page
      window.location.reload();
    };
    
    fetchTodayActivities();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">Today's Activities for {childName}</h2>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>
      
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {showQuickObserve && selectedActivity && (
          <div className="mb-4">
            <QuickObservationForm 
              activityId={selectedActivity.activityId}
              childId={childId}
              activityTitle={selectedActivity.title}
              weeklyPlanId={weeklyPlanId || undefined}
              dayOfWeek={format(new Date(), 'EEEE')}
              onSuccess={handleObservationComplete}
              onClose={() => setShowQuickObserve(false)}
            />
          </div>
        )}
      
        {todayActivities.length > 0 ? (
          <div className="space-y-3">
            {todayActivities.map(activity => (
              <div 
                key={activity.id}
                className={`border rounded-lg overflow-hidden ${
                  activity.status === 'completed' ? 'border-green-300 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div 
                  className="p-3 cursor-pointer"
                  onClick={() => handleActivitySelect(activity)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{activity.title}</h3>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                    {activity.status === 'completed' ? (
                      <span className="flex items-center text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markComplete(activity.activityId);
                        }}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1 rounded text-sm"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500 space-x-3">
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
                  </div>
                </div>
                
                {activity.status === 'completed' && (
                  <div className="flex border-t border-green-200 text-sm">
                    <button className="flex items-center justify-center py-2 flex-1 text-green-700 hover:bg-green-100">
                      <Camera className="h-4 w-4 mr-1" />
                      Add Photo
                    </button>
                    <button className="flex items-center justify-center py-2 flex-1 text-green-700 hover:bg-green-100 border-l border-green-200">
                      <FileText className="h-4 w-4 mr-1" />
                      Add Notes
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No activities planned for today.</p>
            <button 
              className="mt-2 text-sm text-emerald-600 hover:text-emerald-700"
              type="button"
            >
              <span>Add Activity</span>
            </button>
          </div>
        )}
        
        <div className="mt-6">
          <button className="flex items-center justify-center w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
            See Activity History
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedActivityDashboard;