// app/components/parent/AllChildrenDailyActivities.tsx
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
  Loader2,
  User,
  Filter,
  X,
  ChevronDown,
  Info as InfoIcon,
  PlusCircle
} from 'lucide-react';
import { format, isToday, addDays, isSameDay } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, orderBy, DocumentData, limit } from 'firebase/firestore';
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

interface Child {
  id: string;
  name: string;
  ageGroup?: string;
}

interface ChildActivities {
  child: Child;
  activities: Activity[];
  hasPlan: boolean; // Added to track if a weekly plan exists
}

interface AllChildrenDailyActivitiesProps {
  selectedDate?: Date;
  onWeeklyViewRequest?: (childId?: string) => void;
  selectedChildId?: string; // Optional filter for a specific child
  onActivitySelect?: (activity: Activity) => void;
}

export default function AllChildrenDailyActivities({ 
  selectedDate,
  onWeeklyViewRequest,
  selectedChildId,
  onActivitySelect
}: AllChildrenDailyActivitiesProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  // State
  const [childActivities, setChildActivities] = useState<ChildActivities[]>([]);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate || new Date());
  const [detailsActivityId, setDetailsActivityId] = useState<string | null>(null);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterChild, setFilterChild] = useState<string>(selectedChildId || 'all');
  const [selectedActivityForObservation, setSelectedActivityForObservation] = useState<Activity | null>(null);
  const [showObservationForm, setShowObservationForm] = useState(false);
  
  // Update currentDate when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      const currentFormatted = format(currentDate, 'yyyy-MM-dd');
      const selectedFormatted = format(selectedDate, 'yyyy-MM-dd');
      
      if (currentFormatted !== selectedFormatted) {
        console.log(`Updating date from prop: ${currentFormatted} -> ${selectedFormatted}`);
        
        // Force a reset to trigger a full refresh
        setLoading(true);
        setError(null);
        setChildActivities([]);
        
        // Update the date state
        setCurrentDate(selectedDate);
      }
    }
  }, [selectedDate]);

  // Update filter when selectedChildId changes
  useEffect(() => {
    if (selectedChildId) {
      setFilterChild(selectedChildId);
    }
  }, [selectedChildId]);

  // First hook: Fetch children
  useEffect(() => {
    if (!currentUser) return;
    
    async function fetchChildren() {
      try {
        setLoading(true);
        console.log('Fetching children for parent ID:', currentUser?.uid);
        
        const childrenQuery = query(
          collection(db, 'children'),
          where('parentId', '==', currentUser?.uid || ''),
          orderBy('name')
        );
        
        const childrenSnapshot = await getDocs(childrenQuery);
        
        if (childrenSnapshot.empty) {
          console.log('No children found for this parent');
          setAllChildren([]);
          setLoading(false);
          return;
        }
        
        // Store all children
        const children: Child[] = childrenSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          ageGroup: doc.data().ageGroup
        }));
        
        console.log(`Found ${children.length} children`);
        setAllChildren(children);
      } catch (error) {
        console.error('Error fetching children:', error);
        setError('Failed to load children');
        setLoading(false);
      }
    }
    
    fetchChildren();
  }, [currentUser]); // Only depend on currentUser

  // Second hook: Fetch activities for all children
  useEffect(() => {
    if (!currentUser || allChildren.length === 0) return;
    
    async function fetchActivities() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching activities for date:', format(currentDate, 'yyyy-MM-dd'));
        
        // Calculate week start date (Monday of the current week)
        const dayOfWeek = format(currentDate, 'EEEE').toLowerCase();
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
        const weekStartString = format(weekStart, 'yyyy-MM-dd');
        
        console.log('Week starting:', weekStartString, 'Day of week:', dayOfWeek);
        
        // For each child, fetch their activities for the current date
        const results: ChildActivities[] = [];
        
        for (const child of allChildren) {
          // If filtering by a specific child, skip others
          if (filterChild !== 'all' && filterChild !== child.id) {
            continue;
          }
          
          console.log(`Processing child: ${child.name} (${child.id})`);
          
          // Find weekly plan for this child and week
          const plansQuery = query(
            collection(db, 'weeklyPlans'),
            where('childId', '==', child.id),
            where('weekStarting', '==', weekStartString)
          );
          
          const plansSnapshot = await getDocs(plansQuery);
          let childActivities: Activity[] = [];
          let hasPlan = !plansSnapshot.empty;
          
          if (plansSnapshot.empty) {
            console.log(`No weekly plan found for child ${child.name} for week starting ${weekStartString}`);
            
            // Instead of creating a random activity, add them to results with empty activities
            // This will trigger the proper empty state guidance
            results.push({
              child,
              activities: [],
              hasPlan: false
            });
          } else {
            // Use the first plan (should only be one per week)
            const planDoc = plansSnapshot.docs[0];
            const planData = planDoc.data();
            
            console.log(`Found plan for child ${child.name}: ${planDoc.id}`);
            
            // Get activities for the current day of the week
            const dayActivities = planData[dayOfWeek] || [];
            
            if (dayActivities.length === 0) {
              console.log(`No activities found for ${dayOfWeek} in the plan`);
              
              // Add to results with empty activities but hasPlan=true
              results.push({
                child,
                activities: [],
                hasPlan: true
              });
            } else {
              console.log(`Found ${dayActivities.length} activities for ${dayOfWeek}`);
              
              // Get full activity details
              const activitiesWithDetails = await Promise.all(
                dayActivities.map(async (activity: any) => {
                  try {
                    const activityDoc = await getDoc(doc(db, 'activities', activity.activityId));
                    
                    // Check if there's an observation for this activity
                    let lastObservedDate = null;
                    try {
                      const observationsQuery = query(
                        collection(db, 'observations'),
                        where('childId', '==', child.id),
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
                        id: `${planDoc.id}_${dayOfWeek}_${activity.activityId}`,
                        activityId: activity.activityId,
                        childId: child.id,
                        childName: child.name,
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
                      id: `${planDoc.id}_${dayOfWeek}_${activity.activityId}`,
                      activityId: activity.activityId,
                      childId: child.id,
                      childName: child.name,
                      title: 'Unknown Activity',
                      status: activity.status || 'suggested',
                      timeSlot: activity.timeSlot || '',
                      order: activity.order || 0
                    };
                  } catch (error) {
                    console.error(`Error fetching activity ${activity.activityId}:`, error);
                    return {
                      id: `${planDoc.id}_${dayOfWeek}_${activity.activityId}`,
                      activityId: activity.activityId,
                      childId: child.id,
                      childName: child.name,
                      title: 'Error Loading Activity',
                      status: activity.status || 'suggested',
                      order: activity.order || 0
                    };
                  }
                })
              );
              
              // Sort activities by order
              childActivities = activitiesWithDetails.sort((a, b) => 
                (a.order || 0) - (b.order || 0)
              );
              
              // Add to results
              results.push({
                child,
                activities: childActivities,
                hasPlan: true
              });
            }
          }
        }
        
        setChildActivities(results);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching activities:', error);
        setError(`Failed to load activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    }
    
    fetchActivities();
  }, [currentUser, currentDate, filterChild, allChildren]);

  // Fix the date navigation
  const handleDateChange = (days: number) => {
    console.log(`Changing date by ${days} days from`, format(currentDate, 'yyyy-MM-dd'));
    const newDate = addDays(currentDate, days);
    console.log(`New date:`, format(newDate, 'yyyy-MM-dd'));
    setCurrentDate(newDate);
  };

  // Handle request to view weekly view
  const handleWeeklyViewRequest = (childId?: string) => {
    if (onWeeklyViewRequest) {
      onWeeklyViewRequest(childId);
    } else {
      // Direct navigation as a fallback
      const url = childId 
        ? `/dashboard/children/${childId}/weekly-plan`
        : `/dashboard/weekly-plan`;
      router.push(url);
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
  
  // View child profile
  const viewChildProfile = (childId: string) => {
    router.push(`/dashboard/children/${childId}`);
  };
  
  // Format date for display
  const formatDateDisplay = (date: Date) => {
    try {
      if (isToday(date)) {
        return 'Today';
      }
      return format(date, 'EEEE, MMMM d');
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid date';
    }
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

  // Button functions to open popups
  const openActivityDetails = (activityId: string) => {
    setDetailsActivityId(activityId);
    setShowDetailsPopup(true);
  };

  const openObservationForm = (activity: Activity) => {
    if (onActivitySelect) {
      // Use the parent component's handler if provided
      onActivitySelect(activity);
    } else {
      // Otherwise handle locally
      setSelectedActivityForObservation(activity);
      setShowObservationForm(true);
    }
  };
  
  // Render loading state
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

  // Get total activity count
  const totalActivities = childActivities.reduce(
    (sum, child) => sum + child.activities.length, 
    0
  );

  // Get completed activity count
  const completedActivities = childActivities.reduce(
    (sum, child) => sum + child.activities.filter(a => a.status === 'completed').length, 
    0
  );

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
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <div className="w-36 text-center mx-1 font-medium">
            {formatDateDisplay(currentDate)}
          </div>
          
          <button
            onClick={() => handleDateChange(1)}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Next day"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            type="button"
          >
            <Filter className="h-4 w-4 mr-1" />
            <span>Filter</span>
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} planned
          {completedActivities > 0 && `, ${completedActivities} completed`}
        </div>
      </div>
      
      {/* Filter dropdown */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Child
            </label>
            <select
              value={filterChild}
              onChange={(e) => setFilterChild(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
            >
              <option value="all">All Children</option>
              {allChildren.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {/* No children case */}
        {allChildren.length === 0 && (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
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
        )}
        
        {/* Activities by child */}
        {childActivities.length > 0 && (
          <div className="space-y-6">
            {childActivities.map(({ child, activities, hasPlan }) => (
              <div key={child.id} className="border rounded-lg overflow-hidden">
                {/* Child header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      {child.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="ml-2 text-md font-medium">{child.name}</h3>
                    {child.ageGroup && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        {child.ageGroup}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => viewChildProfile(child.id)}
                      className="text-sm text-emerald-600 hover:text-emerald-700"
                      type="button"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleWeeklyViewRequest(child.id)}
                      className="text-sm text-emerald-600 hover:text-emerald-700"
                      type="button"
                    >
                      Weekly Plan
                    </button>
                  </div>
                </div>
                
                {/* Child activities */}
                <div className="p-4">
                  {activities.length > 0 ? (
                    <div className="space-y-3">
                      {activities.map(activity => (
                        <div 
                          key={activity.id}
                          className={`border rounded-lg overflow-hidden ${
                            activity.status === 'completed' ? 'border-green-300 bg-green-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-medium">{activity.title}</h3>
                                {activity.description && (
                                  <p className="text-sm text-gray-600">{activity.description}</p>
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
                              {activity.timeSlot && (
                                <span className="capitalize">
                                  {activity.timeSlot}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="bg-gray-50 px-3 py-2 flex space-x-4">
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
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      {/* UPDATED EMPTY STATE WITH BETTER GUIDANCE */}
                      <p className="text-gray-700 font-medium mb-2">
                        {isToday(currentDate) ? 'No activities planned for today.' : `No activities planned for ${format(currentDate, 'MMMM d')}.`}
                      </p>
                      
                      {!hasPlan ? (
                        <>
                          <p className="text-gray-500 text-sm mb-4">
                            Generate a weekly plan to see activities for {child.name}.
                          </p>
                          <Link
                            href={`/dashboard/children/${child.id}/weekly-plan`}
                            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Create Weekly Plan
                          </Link>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-500 text-sm mb-4">
                            This day has no scheduled activities in the weekly plan.
                          </p>
                          <Link
                            href={`/dashboard/children/${child.id}/weekly-plan`}
                            className="inline-flex items-center px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700"
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            View Weekly Plan
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Render the activity details popup */}
        {showDetailsPopup && detailsActivityId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
              <ActivityDetailsPopup 
                activityId={detailsActivityId || ''} 
                onClose={() => setShowDetailsPopup(false)}
              />
            </div>
          </div>
        )}
        
        {/* Observation Form Modal */}
        {showObservationForm && selectedActivityForObservation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <QuickObservationForm
                activityId={selectedActivityForObservation.activityId}
                childId={selectedActivityForObservation.childId}
                activityTitle={selectedActivityForObservation.title}
                onSuccess={() => {
                  setShowObservationForm(false);
                  
                  // Update the local state to mark the activity as completed
                  setChildActivities(prevChildActivities => {
                    return prevChildActivities.map(childActivity => {
                      if (childActivity.child.id !== selectedActivityForObservation?.childId) {
                        return childActivity;
                      }
                      
                      const updatedActivities = childActivity.activities.map(activity => {
                        if (activity.id !== selectedActivityForObservation?.id) {
                          return activity;
                        }
                        
                        // Mark as completed and set the observation date
                        // Make a new activity object with the correct types
                        const updatedActivity: Activity = {
                          ...activity,
                          status: 'completed' as 'suggested' | 'confirmed' | 'completed',
                          lastObservedDate: new Date()
                        };
                        
                        return updatedActivity;
                      });
                      
                      return {
                        ...childActivity,
                        activities: updatedActivities
                      };
                    });
                  });
                }}
                onClose={() => setShowObservationForm(false)}
              />
            </div>
          </div>
        )}
        
        {/* Navigation to weekly view */}
        <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="text-gray-500 text-sm">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <button
            onClick={() => handleWeeklyViewRequest()}
            className="flex items-center text-sm text-emerald-600 hover:text-emerald-700"
            type="button"
          >
            View All Weekly Plans
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}