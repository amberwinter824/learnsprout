// app/components/parent/AllChildrenWeeklyView.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Star, 
  Loader2,
  User,
  Filter,
  Clock,
  ChevronDown,
  Info,
  Plus,
  PlusCircle
} from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, isToday } from 'date-fns';
import { collection, query, where, getDocs, getDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ActivityDetailsPopup from './ActivityDetailsPopup';
import QuickObservationForm from './QuickObservationForm';

// Define interfaces
interface Child {
  id: string;
  name: string;
  ageGroup?: string;
}

interface Activity {
  id: string;
  activityId: string;
  childId: string;
  childName: string;
  title: string;
  description?: string;
  area?: string;
  duration?: number;
  isHomeSchoolConnection?: boolean;
  status: 'suggested' | 'confirmed' | 'completed';
  timeSlot?: string;
  order?: number;
  lastObservedDate?: Date | string;
}

interface ChildDayActivities {
  child: Child;
  activities: Activity[];
}

interface AllChildrenWeeklyViewProps {
  onWeeklyViewRequest?: (childId?: string) => void;
  onDailyViewRequest?: () => void;
  selectedChildId?: string;
  parentId?: string;
}

// Add cache interface
interface WeeklyPlanCache {
  [key: string]: {
    data: { [day: string]: ChildDayActivities[] };
    timestamp: number;
  };
}

export default function AllChildrenWeeklyView({
  onWeeklyViewRequest,
  onDailyViewRequest,
  selectedChildId,
  parentId
}: AllChildrenWeeklyViewProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  // State
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [childrenActivities, setChildrenActivities] = useState<{ [day: string]: ChildDayActivities[] }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filterChild, setFilterChild] = useState<string>(selectedChildId || 'all');
  
  // Update filterChild when selectedChildId changes
  useEffect(() => {
    if (selectedChildId) {
      setFilterChild(selectedChildId);
    } else {
      setFilterChild('all');
    }
  }, [selectedChildId]);
  
  // Activity details popup state
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [detailsActivityId, setDetailsActivityId] = useState<string | null>(null);
  
  // Quick observation form state
  const [showQuickObservation, setShowQuickObservation] = useState(false);
  const [observationActivity, setObservationActivity] = useState<Activity | null>(null);
  
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
  
  // Use parentId prop if provided, otherwise fall back to currentUser.uid
  const effectiveParentId = parentId || currentUser?.uid;
  
  // Add cache state
  const [planCache, setPlanCache] = useState<WeeklyPlanCache>({});
  
  // Fetch children
  useEffect(() => {
    if (!effectiveParentId) return;
    
    async function fetchChildren() {
      try {
        const childrenQuery = query(
          collection(db, 'children'),
          where('parentId', '==', effectiveParentId),
          orderBy('name')
        );
        
        const childrenSnapshot = await getDocs(childrenQuery);
        
        if (childrenSnapshot.empty) {
          setAllChildren([]);
          return;
        }
        
        const children: Child[] = childrenSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          ageGroup: doc.data().ageGroup
        }));
        
        setAllChildren(children);
      } catch (error) {
        console.error('Error fetching children:', error);
        setError('Failed to load children');
      }
    }
    
    fetchChildren();
  }, [effectiveParentId]);
  
  // Optimized fetch function
  const fetchAllChildrenActivities = useCallback(async () => {
    if (!currentUser || !allChildren.length) return;
    
    try {
      console.log('Fetching weekly plan for week starting:', format(weekStart, 'yyyy-MM-dd'));
      setLoading(true);
      setError(null);
      
      const weekStartDate = format(weekStart, 'yyyy-MM-dd');
      const cacheKey = `${effectiveParentId}_${weekStartDate}`;
      
      // Check cache first
      const cachedData = planCache[cacheKey];
      if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minute cache
        setChildrenActivities(cachedData.data);
        setLoading(false);
        return;
      }
      
      const weekActivitiesData: { [day: string]: ChildDayActivities[] } = {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      };
      
      // Batch fetch all plans for the week
      const planPromises = allChildren
        .filter(child => filterChild === 'all' || filterChild === child.id)
        .map(child => {
          const planId = `${child.id}_${weekStartDate}`;
          return getDoc(doc(db, 'weeklyPlans', planId));
        });
      
      const planSnapshots = await Promise.all(planPromises);
      
      // Batch fetch all activities
      const activityIds = new Set<string>();
      planSnapshots.forEach(snap => {
        if (snap.exists()) {
          const data = snap.data();
          Object.values(data).forEach((dayActivities: any) => {
            if (Array.isArray(dayActivities)) {
              dayActivities.forEach((activity: any) => {
                activityIds.add(activity.activityId);
              });
            }
          });
        }
      });
      
      const activityPromises = Array.from(activityIds).map(id => 
        getDoc(doc(db, 'activities', id))
      );
      const activitySnapshots = await Promise.all(activityPromises);
      const activitiesMap = new Map(
        activitySnapshots.map(snap => [snap.id, snap.data()])
      );
      
      // Process all plans
      planSnapshots.forEach((snap, index) => {
        if (!snap.exists()) return;
        
        const child = allChildren[index];
        const planData = snap.data();
        
        Object.entries(planData).forEach(([dayKey, dayActivities]: [string, any]) => {
          if (!Array.isArray(dayActivities)) return;
          
          const day = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
          if (!weekActivitiesData[day]) return;
          
          const processedActivities = dayActivities.map((activity: any) => {
            const activityData = activitiesMap.get(activity.activityId);
            if (!activityData) return null;
            
            return {
              id: `${snap.id}_${day}_${activity.activityId}`,
              activityId: activity.activityId,
              childId: child.id,
              childName: child.name,
              title: activityData.title || 'Unknown Activity',
              description: activityData.description,
              area: activityData.area,
              duration: activityData.duration || 15,
              isHomeSchoolConnection: activityData.isHomeSchoolConnection,
              status: activity.status || 'suggested',
              timeSlot: activity.timeSlot,
              order: activity.order || 0,
              lastObservedDate: activity.lastObservedDate
            } as Activity;
          }).filter((activity): activity is Activity => activity !== null);
          
          if (processedActivities.length > 0) {
            weekActivitiesData[day].push({
              child,
              activities: processedActivities
            });
          }
        });
      });
      
      // Update cache
      setPlanCache(prev => ({
        ...prev,
        [cacheKey]: {
          data: weekActivitiesData,
          timestamp: Date.now()
        }
      }));
      
      setChildrenActivities(weekActivitiesData);
    } catch (error) {
      console.error('Error fetching weekly plan:', error);
      setError('Failed to load weekly plan');
    } finally {
      setLoading(false);
    }
  }, [currentUser, allChildren, weekStart, filterChild, effectiveParentId, planCache]);
  
  // Update useEffect to use the optimized fetch function
  useEffect(() => {
    fetchAllChildrenActivities();
  }, [fetchAllChildrenActivities]);
  
  // Navigate to previous week
  const handlePrevWeek = () => {
    setLoading(true);
    setError(null);
    setChildrenActivities({});
    setCurrentWeek(prev => addWeeks(prev, -1));
  };
  
  // Navigate to next week
  const handleNextWeek = () => {
    setLoading(true);
    setError(null);
    setChildrenActivities({});
    setCurrentWeek(prev => addWeeks(prev, 1));
  };
  
  // Handle activity details
  const handleHowTo = (activity: Activity) => {
    setDetailsActivityId(activity.activityId);
    setShowDetailsPopup(true);
  };
  
  // Handle adding observation
  const handleAddObservation = (activity: Activity) => {
    setObservationActivity(activity);
    setShowQuickObservation(true);
  };
  
  // Handle observation success
  const handleObservationSuccess = () => {
    setShowQuickObservation(false);
    
    // Refresh data - we'll just reload the current week
    setLoading(true);
    setError(null);
    setChildrenActivities({});
    setCurrentWeek(prev => new Date(prev));
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
    let totalActivities = 0;
    let completedActivities = 0;
    
    Object.values(childrenActivities).forEach(dayChildren => {
      dayChildren.forEach(childDay => {
        totalActivities += childDay.activities.length;
        completedActivities += childDay.activities.filter(a => a.status === 'completed').length;
      });
    });
    
    return {
      totalActivities,
      completedActivities,
      percentComplete: totalActivities > 0 
        ? Math.round((completedActivities / totalActivities) * 100) 
        : 0
    };
  };
  
  const weekStats = calculateWeekStats();
  
  // View child profile
  const handleViewChild = (childId: string) => {
    router.push(`/dashboard/children/${childId}`);
  };
  
  // Go to child's weekly plan
  const handleViewChildWeeklyPlan = (childId: string) => {
    if (onWeeklyViewRequest) {
      onWeeklyViewRequest(childId);
    } else {
      router.push(`/dashboard/children/${childId}/weekly-plan`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading weekly plans...</p>
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
          <h2 className="text-lg font-medium">Weekly Overview</h2>
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
          
          {onDailyViewRequest && (
            <button
              onClick={onDailyViewRequest}
              className="ml-4 flex items-center text-sm text-gray-600 hover:text-gray-800"
              type="button"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Daily View
            </button>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          {weekStats.totalActivities} {weekStats.totalActivities === 1 ? 'activity' : 'activities'} planned
          {weekStats.completedActivities > 0 && `, ${weekStats.completedActivities} completed`}
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
          <div className="grid grid-cols-2 gap-3">
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
          </div>
        </div>
        
        {/* No children case */}
        {allChildren.length === 0 && (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
            <User className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No children profiles</h3>
            <p className="text-gray-500 text-sm mb-4">
              Add a child profile to see weekly plans
            </p>
            <Link 
              href="/dashboard/children/add"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md"
            >
              Add Child
            </Link>
          </div>
        )}
        
        {/* Days of the week - vertical layout */}
        {allChildren.length > 0 && (
          <div className="space-y-6">
            {weekDays.map((day) => (
              <div 
                key={day.dayName}
                className={`border rounded-lg overflow-hidden ${
                  day.isToday ? 'border-emerald-300' : 'border-gray-200'
                }`}
              >
                {/* Day header */}
                <div 
                  className={`px-4 py-3 flex justify-between items-center ${
                    day.isToday ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}
                >
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
                    {childrenActivities[day.dayName]?.reduce((sum, child) => sum + child.activities.length, 0) || 0} activities
                  </div>
                </div>
                
                {/* Activities for the day grouped by child */}
                <div>
                  {childrenActivities[day.dayName] && childrenActivities[day.dayName].length > 0 ? (
                    childrenActivities[day.dayName].map(childActivities => (
                      <div key={childActivities.child.id} className="border-t border-gray-100">
                        {/* Child header */}
                        <div className="px-4 py-2 bg-gray-50 flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                              {childActivities.child.name.charAt(0).toUpperCase()}
                            </div>
                            <h4 className="ml-2 font-medium text-sm">{childActivities.child.name}</h4>
                            {childActivities.child.ageGroup && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                {childActivities.child.ageGroup}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewChild(childActivities.child.id)}
                              className="text-xs text-emerald-600 hover:text-emerald-700"
                              type="button"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={() => handleViewChildWeeklyPlan(childActivities.child.id)}
                              className="text-xs text-emerald-600 hover:text-emerald-700"
                              type="button"
                            >
                              Weekly Plan
                            </button>
                          </div>
                        </div>

                        {/* Child's activities for the day */}
                        <div className="divide-y divide-gray-100">
                          {childActivities.activities.map(activity => (
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
                              
                                {activity.timeSlot && (
                                  <span className="capitalize">
                                    {activity.timeSlot}
                                  </span>
                                )}
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
                          ))}
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
      
      {/* Quick Observation Form */}
      {showQuickObservation && observationActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <QuickObservationForm
              activityId={observationActivity.activityId}
              childId={observationActivity.childId}
              activityTitle={observationActivity.title}
              onSuccess={handleObservationSuccess}
              onClose={() => setShowQuickObservation(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}