// app/components/parent/WeeklyPlanWithDayFocus.tsx
'use client';

import { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { format, isToday, addDays, subDays, isSameDay, startOfWeek, endOfWeek, getDay, formatISO } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import ActivityDetailsPopup from './ActivityDetailsPopup';
import QuickObservationForm from './QuickObservationForm';

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
  selectedChildId?: string;
  onGeneratePlan?: (childId: string) => Promise<any>;
}

export default function WeeklyPlanWithDayFocus({ 
  selectedDate: initialDate,
  selectedChildId,
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
        
        // Set selected child from prop or default to first child
        if (selectedChildId) {
          const selectedChild = children.find(child => child.id === selectedChildId) || null;
          setSelectedChild(selectedChild);
        } else if (children.length === 1) {
          setSelectedChild(children[0]);
        }
      } catch (error) {
        console.error('Error fetching children:', error);
        setError('Failed to load children');
        setLoading(false);
      }
    }
    
    fetchChildren();
  }, [currentUser, selectedChildId]);
  
  // Fetch week activities when selected child or week changes
  useEffect(() => {
    if (!currentUser || !selectedChild) {
      // Clear or set default state when dependencies are null
      setWeekActivities([]);
      setWeekHasPlan(false);
      setLoading(false);
      return;
    }
    
    async function fetchWeekActivities() {
      if (!selectedChild) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const weekStartString = format(weekStartDate, 'yyyy-MM-dd');
        const childPreferences = selectedChild?.preferences?.activityPreferences?.scheduleByDay || {};
        
        // Find weekly plan for this child and week
        const plansQuery = query(
          collection(db, 'weeklyPlans'),
          where('childId', '==', selectedChild!.id),
          where('weekStarting', '==', weekStartString)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        let planData: any = null;
        let planId: string = '';
        
        // Array to hold activities for each day of the week
        const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const weekDays: DayActivities[] = [];
        
        // Flag to track if a plan exists for this week
        const hasPlan = !plansSnapshot.empty;
        setWeekHasPlan(hasPlan);
        
        if (plansSnapshot.empty) {
          // No plan exists, set up empty days
          daysOfWeek.forEach((dayName, index) => {
            const dayDate = addDays(weekStartDate, index);
            const preferredActivityCount = childPreferences[dayName] || 0;
            
            weekDays.push({
              date: dayDate,
              dayName: format(dayDate, 'EEEE'),
              dayOfWeek: dayName,
              activities: [],
              hasPlan: false,
              isRestDay: preferredActivityCount === 0 // If preference is 0, it's a rest day
            });
          });
        } else {
          // Plan exists, process it
          const planDoc = plansSnapshot.docs[0];
          planData = planDoc.data();
          planId = planDoc.id;
          
          // Process each day of the week
          for (let i = 0; i < daysOfWeek.length; i++) {
            const dayName = daysOfWeek[i];
            const dayDate = addDays(weekStartDate, i);
            const preferredActivityCount = childPreferences[dayName] || 0;
            const dayActivities = planData[dayName] || [];
            
            // If this is a "rest day" (0 activities preferred) but there are activities,
            // we still want to load and show them
            const isRestDay = preferredActivityCount === 0 && dayActivities.length === 0;
            
            if (dayActivities.length === 0) {
              // No activities for this day
              weekDays.push({
                date: dayDate,
                dayName: format(dayDate, 'EEEE'),
                dayOfWeek: dayName,
                activities: [],
                hasPlan: true,
                isRestDay
              });
            } else {
              // Process activities for this day
              const processedActivities = await Promise.all(
                dayActivities.map(async (activity: any) => {
                  try {
                    const activityDocRef = doc(db, 'activities', activity.activityId);
                    const activityDoc = await getDoc(activityDocRef);
                    
                    // Check if there's an observation for this activity
                    let lastObservedDate = null;
                    try {
                      const observationsQuery = query(
                        collection(db, 'observations'),
                        where('childId', '==', selectedChild!.id),
                        where('activityId', '==', activity.activityId),
                        orderBy('observedAt', 'desc'),
                        limit(1)
                      );
                      
                      const observationsSnapshot = await getDocs(observationsQuery);
                      if (!observationsSnapshot.empty) {
                        const observationData = observationsSnapshot.docs[0].data();
                        lastObservedDate = observationData.observedAt;
                      }
                    } catch (obsError) {
                      console.error('Error fetching observations:', obsError);
                    }
                    
                    if (activityDoc.exists()) {
                      const activityData = activityDoc.data();
                      return {
                        id: `${planId}_${dayName}_${activity.activityId}`,
                        activityId: activity.activityId,
                        childId: selectedChild!.id,
                        childName: selectedChild!.name,
                        title: activityData.title || 'Untitled Activity',
                        description: activityData.description || '',
                        area: activityData.area || '',
                        duration: activityData.duration || 15,
                        isHomeSchoolConnection: activityData.environmentType === 'bridge' || 
                                              !!activityData.classroomExtension,
                        status: lastObservedDate ? 'completed' : (activity.status || 'suggested'),
                        timeSlot: activity.timeSlot || '',
                        order: activity.order || 0,
                        lastObservedDate: lastObservedDate
                      };
                    }
                    
                    // If activity not found, return with basic info
                    return {
                      id: `${planId}_${dayName}_${activity.activityId}`,
                      activityId: activity.activityId,
                      childId: selectedChild!.id,
                      childName: selectedChild!.name,
                      title: 'Unknown Activity',
                      status: activity.status || 'suggested',
                      timeSlot: activity.timeSlot || '',
                      order: activity.order || 0
                    };
                  } catch (error) {
                    console.error(`Error fetching activity ${activity.activityId}:`, error);
                    return {
                      id: `${planId}_${dayName}_${activity.activityId}`,
                      activityId: activity.activityId,
                      childId: selectedChild!.id,
                      childName: selectedChild!.name,
                      title: 'Error Loading Activity',
                      status: activity.status || 'suggested',
                      order: activity.order || 0
                    };
                  }
                })
              );
              
              // Sort activities by order
              const sortedActivities = processedActivities.sort((a, b) => 
                (a.order || 0) - (b.order || 0)
              );
              
              weekDays.push({
                date: dayDate,
                dayName: format(dayDate, 'EEEE'),
                dayOfWeek: dayName,
                activities: sortedActivities,
                hasPlan: true,
                isRestDay: false
              });
            }
          }
        }
        
        setWeekActivities(weekDays);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching week activities:', error);
        setError(`Failed to load activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    }
    
    fetchWeekActivities();
  }, [currentUser, selectedChild, weekStartDate]);
  
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
  
  // Handle child selection
  const handleChildSelect = (childId: string) => {
    const child = allChildren.find(c => c.id === childId) || null;
    setSelectedChild(child);
  };
  
  // Get activities for the selected day
  const getSelectedDayActivities = () => {
    const selectedDayOfWeek = format(selectedDate, 'EEEE').toLowerCase();
    return weekActivities.find(day => day.dayOfWeek === selectedDayOfWeek) || null;
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
  
  // Handle generate plan button click
  const handleGeneratePlan = async () => {
    if (!selectedChild || !onGeneratePlan) return;
    
    try {
      setIsGeneratingPlan(true);
      await onGeneratePlan(selectedChild.id);
    } catch (error) {
      console.error('Error generating plan:', error);
      setError('Failed to generate plan. Please try again.');
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
  
  // Handle successful observation submission
  const handleObservationSuccess = () => {
    setShowActivityForm(false);
    setSelectedActivity(null);
    
    // In a real implementation, you would update the local state or refresh the data
    // For now, we'll just reset the form
  };
  
  // Get activity count for a day
  const getDayActivityCount = (day: DayActivities) => {
    return day.activities.length;
  };
  
  // Get completed activity count for a day
  const getDayCompletedCount = (day: DayActivities) => {
    return day.activities.filter(a => a.status === 'completed').length;
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
  
  // Child selection required state
  if (!selectedChild) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Select a child to view activities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {allChildren.map(child => (
            <button
              key={child.id}
              onClick={() => handleChildSelect(child.id)}
              className="p-4 border border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="flex items-center">
                <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-medium">
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <span className="ml-3 font-medium">{child.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  // Determine if selected day is a rest day
  const selectedDayActivities = getSelectedDayActivities();
  const isSelectedDayRestDay = selectedDayActivities?.isRestDay || false;
  
  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header with child selection and week navigation */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">
            {selectedChild?.name || 'Activities'}
          </h2>
          
          {selectedChild && allChildren.length > 1 && (
            <select
              value={selectedChild.id}
              onChange={(e) => handleChildSelect(e.target.value)}
              className="ml-3 text-sm border-gray-300 rounded-md"
            >
              {allChildren.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          )}
        </div>
        
        <div className="flex items-center">
          <button
            onClick={() => handleWeekChange('prev')}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Previous week"
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="w-36 text-center mx-1 font-medium">
            {format(weekStartDate, 'MMM d')} - {format(addDays(weekStartDate, 6), 'MMM d')}
          </div>
          
          <button
            onClick={() => handleWeekChange('next')}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Next week"
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Weekly calendar strip */}
      <div className="px-4 py-4 border-b border-gray-200 overflow-x-auto">
        <div className="flex min-w-max">
          {weekActivities.map((day, index) => (
            <div 
              key={day.dayOfWeek}
              onClick={() => handleDaySelect(day.date)}
              className={`
                w-32 mx-1 p-2 border rounded-lg cursor-pointer transition-colors
                ${isSameDay(day.date, selectedDate) 
                  ? 'border-emerald-500 bg-emerald-50' 
                  : 'border-gray-200 hover:border-emerald-300 bg-white'}
                ${day.isRestDay ? 'opacity-60' : ''}
              `}
            >
              <div className="text-center mb-2">
                <p className={`text-xs font-medium ${isSameDay(day.date, selectedDate) ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {day.dayName.substring(0, 3).toUpperCase()}
                </p>
                <p className={`text-lg font-bold ${isSameDay(day.date, selectedDate) ? 'text-emerald-700' : 'text-gray-700'}`}>
                  {format(day.date, 'd')}
                </p>
              </div>
              
              <div className="text-center">
                {day.isRestDay ? (
                  <p className="text-xs text-gray-500">Rest Day</p>
                ) : day.activities.length === 0 ? (
                  <p className="text-xs text-gray-500">No activities</p>
                ) : (
                  <div className="flex justify-center space-x-1">
                    {[...Array(Math.min(day.activities.length, 3))].map((_, i) => (
                      <div 
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          isSameDay(day.date, selectedDate) ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                    {day.activities.length > 3 && (
                      <span className="text-xs text-gray-500">+{day.activities.length - 3}</span>
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
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center mb-6">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Weekly Plan Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {selectedChild.name} doesn't have activities planned for this week. Generate a personalized
              weekly plan based on their age, interests, and development needs.
            </p>
            
            <button
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan || !onGeneratePlan}
              className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {isGeneratingPlan ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Weekly Plan
                </>
              )}
            </button>
          </div>
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
                            {activity.area.replace(/_/g, ' ')}
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
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                {selectedDayActivities.isRestDay ? (
                  <>
                    <p className="text-gray-700 font-medium mb-2">
                      No activities scheduled for {format(selectedDate, 'EEEE')}.
                    </p>
                    <p className="text-gray-500 text-sm">
                      This is a rest day based on your weekly schedule preferences.
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
    </div>
  );
}