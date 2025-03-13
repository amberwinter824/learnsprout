// app/components/parent/MultiChildDailyDashboard.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Filter,
  Clock,
  Loader2,
  BookOpen
} from 'lucide-react';
import { format, isToday, isSameDay, addDays } from 'date-fns';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  ageGroup?: string;
  [key: string]: any;
}

interface Activity {
  id: string;
  activityId: string;
  title: string;
  description?: string;
  area?: string;
  duration?: number;
  isHomeSchoolConnection?: boolean;
  status: 'suggested' | 'confirmed' | 'completed';
  timeSlot?: string;
  order?: number;
  childId: string;
  childName: string;
}

interface MultiChildDailyDashboardProps {
  childrenData: Child[];
  selectedChildId: string | null;
  onActivitySelect?: (childId: string, activityId: string, activityTitle: string) => void;
  onDateChange?: (date: Date) => void;
  selectedDate?: Date;
  userId: string;
}

export default function MultiChildDailyDashboard({
  childrenData,
  selectedChildId,
  onActivitySelect,
  onDateChange,
  selectedDate = new Date(),
  userId
}: MultiChildDailyDashboardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate);
  const [weekPlanIds, setWeekPlanIds] = useState<Record<string, string>>({});
  
  // Fetch activities for the current date across all children
  useEffect(() => {
    if (childrenData.length === 0) {
      setLoading(false);
      return;
    }
    
    async function fetchActivities() {
      try {
        setLoading(true);
        setError(null);
        
        const allChildrenActivities: Activity[] = [];
        
        // Process each child
        for (const child of childrenData) {
          if (selectedChildId && selectedChildId !== child.id) {
            continue; // Skip if filtering by a specific child
          }
          
          // 1. First try to get activities from weekly plans
          // Format date for query
          const dayOfWeek = format(currentDate, 'EEEE').toLowerCase();
          
          // Find the current week's plan for this child
          const weekStartDate = new Date(currentDate);
          const day = weekStartDate.getDay();
          const diff = weekStartDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust to get Monday
          weekStartDate.setDate(diff);
          weekStartDate.setHours(0, 0, 0, 0);
          
          const weekStartString = format(weekStartDate, 'yyyy-MM-dd');
          
          const plansQuery = query(
            collection(db, 'weeklyPlans'),
            where('childId', '==', child.id),
            where('weekStarting', '==', weekStartString)
          );
          
          const plansSnapshot = await getDocs(plansQuery);
          
          // If no plan exists for this child and day, continue to next child
          if (plansSnapshot.empty) {
            continue;
          }
          
          // Use the first plan for this child
          const planDoc = plansSnapshot.docs[0];
          const planData = planDoc.data();
          const planId = planDoc.id;
          
          // Get activities for the day
          const dayActivities = planData[dayOfWeek] || [];
          
          if (dayActivities.length === 0) {
            continue;
          }
          
          // Fetch activity details for each activity
          const activitiesWithDetails: Activity[] = [];
          
          for (const activity of dayActivities) {
            try {
              const activityDoc = await getDoc(doc(db, 'activities', activity.activityId));
              
              if (activityDoc.exists()) {
                const activityData = activityDoc.data();
                activitiesWithDetails.push({
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
                  order: activity.order,
                  childId: child.id,
                  childName: child.name
                });
              } else {
                // If activity not found, still include it with basic info
                activitiesWithDetails.push({
                  id: `${planId}_${dayOfWeek}_${activity.activityId}`,
                  activityId: activity.activityId,
                  title: 'Unknown Activity',
                  status: activity.status,
                  timeSlot: activity.timeSlot || 'anytime',
                  order: activity.order || 0,
                  childId: child.id,
                  childName: child.name
                });
              }
            } catch (error) {
              console.error(`Error fetching activity ${activity.activityId}:`, error);
            }
          }
          
          // 2. If no activities found, try to get daily activities
          if (activitiesWithDetails.length === 0) {
            const dailyActivitiesQuery = query(
              collection(db, 'childActivities'),
              where('childId', '==', child.id),
              where('date', '==', format(currentDate, 'yyyy-MM-dd'))
            );
            
            const dailySnapshot = await getDocs(dailyActivitiesQuery);
            
            if (!dailySnapshot.empty) {
              for (const activityDoc of dailySnapshot.docs) {
                const activityData = activityDoc.data();
                
                // Get activity details
                const activityDetailsDoc = await getDoc(doc(db, 'activities', activityData.activityId));
                
                if (activityDetailsDoc.exists()) {
                  const details = activityDetailsDoc.data();
                  activitiesWithDetails.push({
                    id: activityDoc.id,
                    activityId: activityData.activityId,
                    title: details.title || 'Untitled Activity',
                    description: details.description || '',
                    area: details.area || '',
                    duration: details.duration || 15,
                    status: activityData.status || 'suggested',
                    timeSlot: activityData.timeSlot || 'anytime',
                    order: activityData.order || 0,
                    childId: child.id,
                    childName: child.name
                  });
                }
              }
            }
          }
          
          // Add this child's activities to the combined list
          allChildrenActivities.push(...activitiesWithDetails);
        }
        
        // Sort activities by timeSlot and then by order
        const sortedActivities = allChildrenActivities.sort((a, b) => {
          // First by timeSlot (morning before afternoon before evening)
          const timeSlotOrder: Record<string, number> = { 
            'morning': 0, 
            'afternoon': 1, 
            'evening': 2, 
            'anytime': 3 
          };
          const timeSlotA = a.timeSlot || 'anytime';
          const timeSlotB = b.timeSlot || 'anytime';
          
          if (timeSlotA in timeSlotOrder && timeSlotB in timeSlotOrder && 
              timeSlotOrder[timeSlotA] !== timeSlotOrder[timeSlotB]) {
            return timeSlotOrder[timeSlotA] - timeSlotOrder[timeSlotB];
          }
          
          // Then by order within the same timeSlot
          return (a.order || 0) - (b.order || 0);
        });
        
        setActivities(sortedActivities);
        setWeekPlanIds({});
        setLoading(false);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load activities');
        setLoading(false);
      }
    }
    
    fetchActivities();
  }, [childrenData, currentDate, selectedChildId]);
  
  // Handle date change
  const handleDateChange = (days: number) => {
    const newDate = addDays(currentDate, days);
    setCurrentDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
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
  
  // Format date for display
  const formatDateDisplay = (date: Date) => {
    if (isToday(date)) {
      return 'Today';
    }
    return format(date, 'EEEE, MMMM d');
  };
  
  // Group activities by timeSlot
  const activitiesByTimeSlot: Record<string, Activity[]> = {};
  activities.forEach(activity => {
    const timeSlot = activity.timeSlot || 'anytime';
    if (!activitiesByTimeSlot[timeSlot]) {
      activitiesByTimeSlot[timeSlot] = [];
    }
    activitiesByTimeSlot[timeSlot].push(activity);
  });
  
  // Time slot display names
  const timeSlotLabels: Record<string, string> = {
    'morning': 'Morning',
    'afternoon': 'Afternoon',
    'evening': 'Evening',
    'anytime': 'Anytime'
  };
  
  // Time slots in display order
  const timeSlotOrder = ['morning', 'afternoon', 'evening', 'anytime'];
  
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

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header with date navigation */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">Daily Activities</h2>
        </div>
        
        <div className="flex items-center">
          <button 
            onClick={() => handleDateChange(-1)}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="w-36 text-center mx-1 font-medium">
            {formatDateDisplay(currentDate)}
          </div>
          
          <button
            onClick={() => handleDateChange(1)}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {activities.length > 0 ? (
          <div>
            {timeSlotOrder.filter(timeSlot => activitiesByTimeSlot[timeSlot]?.length > 0).map(timeSlot => (
              <div key={timeSlot} className="mb-6 last:mb-0">
                <h3 className="text-sm font-medium text-gray-700 mb-3">{timeSlotLabels[timeSlot]}</h3>
                <div className="space-y-3">
                  {activitiesByTimeSlot[timeSlot].map(activity => (
                    <div 
                      key={activity.id}
                      className={`border rounded-lg overflow-hidden ${
                        activity.status === 'completed' ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div 
                        className="p-3 cursor-pointer"
                        onClick={() => onActivitySelect && onActivitySelect(activity.childId, activity.activityId, activity.title)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{activity.title}</h3>
                            {activity.description && (
                              <p className="text-sm text-gray-600 line-clamp-1">{activity.description}</p>
                            )}
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                              {activity.childName}
                            </span>
                            
                            {activity.status === 'completed' ? (
                              <span className="flex items-center text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Done
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onActivitySelect && onActivitySelect(activity.childId, activity.activityId, activity.title);
                                }}
                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1 rounded text-xs"
                              >
                                Mark Done
                              </button>
                            )}
                          </div>
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
                              School Connection
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
            <BookOpen className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No activities for this day</h3>
            <p className="text-gray-500 text-sm mb-4">
              {isToday(currentDate) ? 
                "We don't have any activities planned for today yet." :
                `No activities were found for ${format(currentDate, 'MMMM d, yyyy')}.`
              }
            </p>
            
            {selectedChildId && (
              <Link
                href={`/dashboard/children/${selectedChildId}/weekly-plan`}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Generate Activities
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}