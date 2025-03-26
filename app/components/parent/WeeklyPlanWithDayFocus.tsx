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
import WeeklyPlanEmptyState from './WeeklyPlanEmptyState';
import { getUserMaterials } from '@/lib/materialsService';

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
  lastObservation?: {
    engagementLevel?: string;
    interestLevel?: string;
    completionDifficulty?: string;
    notes?: string;
    skillsDemonstrated?: string[];
  };
  materialsNeeded?: string[];
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
  onGeneratePlan?: (childId: string, weekStartDate?: Date) => Promise<any>;
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
  const [ownedMaterialIds, setOwnedMaterialIds] = useState<string[]>([]);
  const [materialLookup, setMaterialLookup] = useState<Map<string, any>>(new Map());
  
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
  
  // Add useEffect to load owned materials
  useEffect(() => {
    const fetchOwnedMaterials = async () => {
      if (!currentUser?.uid) return;
      
      try {
        // Get materials the user owns
        const ownedIds = await getUserMaterials(currentUser.uid);
        setOwnedMaterialIds(ownedIds);
        
        // Get all materials to create a lookup table
        const materialsRef = collection(db, 'materials');
        const materialsSnapshot = await getDocs(materialsRef);
        
        const materials = new Map();
        materialsSnapshot.forEach(doc => {
          const data = doc.data();
          materials.set(data.normalizedName, {
            id: doc.id,
            ...data
          });
        });
        
        setMaterialLookup(materials);
      } catch (error) {
        console.error('Error fetching owned materials:', error);
      }
    };
    
    if (currentUser?.uid) {
      fetchOwnedMaterials();
    }
  }, [currentUser]);
  
  // Create a function reference for fetchWeekActivities
  const fetchWeekActivitiesRef = async () => {
    if (!currentUser || !selectedChild) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const weekStartString = format(weekStartDate, 'yyyy-MM-dd');
      console.log('Fetching weekly plan for week starting:', weekStartString);
      
      // Get child/user preferences for schedule
      const childPreferences = selectedChild.preferences?.activityPreferences?.scheduleByDay || {};
      const userPreferences = currentUser.preferences?.activityPreferences?.scheduleByDay || {};
      
      // Use whatever preferences are available, prioritizing child-specific ones
      const schedulePreferences = Object.keys(childPreferences).length > 0 
        ? childPreferences 
        : userPreferences;
      
      console.log('Using schedule preferences:', schedulePreferences);
      
      // First try to fetch by the plan ID format (childId_date)
      const planId = `${selectedChild.id}_${weekStartString}`;
      console.log('Looking for plan with ID:', planId);
      
      // Try to get the plan directly by ID first
      const planDocRef = doc(db, 'weeklyPlans', planId);
      const planDocSnap = await getDoc(planDocRef);
      
      let planData: any = null;
      let foundPlanId: string = '';
      let hasPlan = false;
      
      if (planDocSnap.exists()) {
        console.log('Found plan by direct ID lookup');
        planData = planDocSnap.data();
        foundPlanId = planDocSnap.id;
        hasPlan = true;
      } else {
        console.log('Plan not found by ID, trying query approach');
        // If not found by ID, try the query approach
        const plansQuery = query(
          collection(db, 'weeklyPlans'),
          where('childId', '==', selectedChild.id),
          where('weekStarting', '==', weekStartString)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        
        if (plansSnapshot.empty) {
          console.log('No weekly plan found via query');
          hasPlan = false;
        } else {
          console.log(`Found ${plansSnapshot.docs.length} plans via query`);
          // Use the first plan (should only be one per week)
          const planDoc = plansSnapshot.docs[0];
          planData = planDoc.data();
          foundPlanId = planDoc.id;
          hasPlan = true;
        }
      }
      
      // Array to hold activities for each day of the week
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const weekDays: DayActivities[] = [];
      
      setWeekHasPlan(hasPlan);
      
      if (!hasPlan) {
        // No plan exists, set up empty days with rest day indicators
        daysOfWeek.forEach((dayName, index) => {
          const dayDate = addDays(weekStartDate, index);
          const preferredActivityCount = schedulePreferences[dayName] || 0;
          
          console.log(`Day ${dayName}: preferred activity count = ${preferredActivityCount}`);
          
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
        // Process each day of the week from the plan
        const activitiesPromises: Promise<any>[] = [];
        
        daysOfWeek.forEach((dayName, index) => {
          const dayDate = addDays(weekStartDate, index);
          const preferredActivityCount = schedulePreferences[dayName] || 0;
          
          console.log(`Processing ${dayName}, preferred count: ${preferredActivityCount}`);
          
          // Get activities for this day
          const dayActivities = planData[dayName] || [];
          
          // Check if this is a rest day (0 activities by preference)
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
            // Process activities for this day similar to WeekAtAGlanceView
            const formattedDayName = format(dayDate, 'EEEE');
            
            const dayPromise = Promise.all(
              dayActivities.map(async (activity: any) => {
                try {
                  // Check if there are observations for this activity
                  let lastObservedDate = null;
                  let lastObservation: Activity['lastObservation'] = {};
                  if (activity.observationIds && activity.observationIds.length > 0) {
                    lastObservedDate = activity.lastObservedDate || null;
                  } else {
                    try {
                      const observationsQuery = query(
                        collection(db, 'progressRecords'),
                        where('childId', '==', selectedChild.id),
                        where('activityId', '==', activity.activityId)
                      );
                      
                      const observationsSnapshot = await getDocs(observationsQuery);
                      if (!observationsSnapshot.empty) {
                        // Sort observations by date (most recent first)
                        const sortedObservations = observationsSnapshot.docs
                          .map(doc => doc.data())
                          .sort((a, b) => {
                            const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
                            const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
                            return dateB.getTime() - dateA.getTime();
                          });
                          
                        if (sortedObservations.length > 0) {
                          lastObservedDate = sortedObservations[0].date;
                          // Store the last observation details
                          lastObservation = {
                            engagementLevel: sortedObservations[0].engagementLevel,
                            interestLevel: sortedObservations[0].interestLevel,
                            completionDifficulty: sortedObservations[0].completionDifficulty,
                            notes: sortedObservations[0].notes,
                            skillsDemonstrated: sortedObservations[0].skillsDemonstrated
                          };
                        }
                      }
                    } catch (observationError) {
                      console.error('Error fetching observations:', observationError);
                    }
                  }
                  
                  // Get activity details
                  const activityDocRef = doc(db, 'activities', activity.activityId);
                  const activityDoc = await getDoc(activityDocRef);
                  
                  if (activityDoc.exists()) {
                    const activityData = activityDoc.data();
                    return {
                      id: `${foundPlanId}_${dayName}_${activity.activityId}`,
                      activityId: activity.activityId,
                      childId: selectedChild.id,
                      childName: selectedChild.name,
                      title: activityData.title || 'Untitled Activity',
                      description: activityData.description || '',
                      area: activityData.area || '',
                      duration: activityData.duration || 15,
                      isHomeSchoolConnection: activityData.environmentType === 'bridge' || 
                                            !!activityData.classroomExtension,
                      status: lastObservedDate ? 'completed' : (activity.status || 'suggested'),
                      timeSlot: activity.timeSlot || '',
                      order: activity.order || 0,
                      lastObservedDate,
                      lastObservation
                    };
                  }
                  
                  // If activity not found, return with basic info
                  return {
                    id: `${foundPlanId}_${dayName}_${activity.activityId}`,
                    activityId: activity.activityId,
                    childId: selectedChild.id,
                    childName: selectedChild.name,
                    title: 'Unknown Activity',
                    status: activity.status || 'suggested',
                    timeSlot: activity.timeSlot || '',
                    order: activity.order || 0,
                    lastObservedDate: null,
                    lastObservation: null
                  };
                } catch (error) {
                  console.error(`Error fetching activity ${activity.activityId}:`, error);
                  return {
                    id: `${foundPlanId}_${dayName}_${activity.activityId}`,
                    activityId: activity.activityId,
                    childId: selectedChild.id,
                    childName: selectedChild.name,
                    title: 'Error Loading Activity',
                    status: activity.status || 'suggested',
                    order: activity.order || 0,
                    lastObservedDate: null,
                    lastObservation: null
                  };
                }
              })
            );
            
            activitiesPromises.push(
              dayPromise.then(activitiesWithDetails => {
                const sortedActivities = activitiesWithDetails.sort((a, b) => 
                  (a.order || 0) - (b.order || 0)
                );
                
                weekDays.push({
                  date: dayDate,
                  dayName: formattedDayName,
                  dayOfWeek: dayName,
                  activities: sortedActivities,
                  hasPlan: true,
                  isRestDay: false
                });
              })
            );
          }
        });
        
        // Wait for all activity promises to resolve
        await Promise.all(activitiesPromises);
        
        // Sort the days in correct order (Monday to Sunday)
        weekDays.sort((a, b) => {
          const order: Record<string, number> = {
            'monday': 0,
            'tuesday': 1,
            'wednesday': 2,
            'thursday': 3,
            'friday': 4,
            'saturday': 5,
            'sunday': 6
          };
          return order[a.dayOfWeek.toLowerCase()] - order[b.dayOfWeek.toLowerCase()];
        });
      }
      
      console.log('Processed weekDays:', weekDays);
      setWeekActivities(weekDays);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching week activities:', error);
      setError(`Failed to load activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };
  
  // Then update the useEffect to use this function
  useEffect(() => {
    if (!currentUser || !selectedChild) {
      // Clear or set default state when dependencies are null
      setWeekActivities([]);
      setWeekHasPlan(false);
      setLoading(false);
      return;
    }
    
    fetchWeekActivitiesRef();
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
  
  // And update the handleGeneratePlan function to use the reference
  const handleGeneratePlan = async () => {
    if (!selectedChild || !onGeneratePlan) {
      console.error("Cannot generate plan: missing child or onGeneratePlan function");
      return;
    }
    
    try {
      setIsGeneratingPlan(true);
      setError(null);
      console.log("Starting plan generation for child:", selectedChild.id, "for week starting:", weekStartDate);
      
      // Add a minimum delay of 8 seconds to show the loading state
      const delayPromise = new Promise(resolve => setTimeout(resolve, 8000));
      
      // Run plan generation and delay in parallel
      const [result] = await Promise.all([
        onGeneratePlan(selectedChild.id, weekStartDate),
        delayPromise
      ]);
      
      console.log("Plan generated successfully:", result);
      
      // Set a success message
      setError("Weekly plan generated successfully!");
      setTimeout(() => setError(null), 3000);
      
      // Important: Trigger a refetch of the activities
      fetchWeekActivitiesRef();
      
    } catch (error) {
      console.error('Error generating plan:', error);
      setError(`Failed to generate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  const handleObservationSuccess = async () => {
    setShowActivityForm(false);
    setSelectedActivity(null);
    
    // Refresh the activities data
    if (selectedChild) {
      await fetchWeekActivitiesRef();
    }
  };
  
  // Get activity count for a day
  const getDayActivityCount = (day: DayActivities) => {
    return day.activities.length;
  };
  
  // Get completed activity count for a day
  const getDayCompletedCount = (day: DayActivities) => {
    return day.activities.filter(a => a.status === 'completed').length;
  };
  
  // Add a function to check if an activity can be done with owned materials
  const canDoActivityWithOwnedMaterials = (activity: Activity) => {
    // If no materials needed, activity can be done
    if (!activity.materialsNeeded || !Array.isArray(activity.materialsNeeded) || activity.materialsNeeded.length === 0) {
      return true;
    }
    
    // Check if all required materials are owned
    return activity.materialsNeeded.every(materialName => {
      const normalizedName = materialName.trim().toLowerCase();
      const material = materialLookup.get(normalizedName);
      
      // If material isn't in our database, we can't check if it's owned
      if (!material) return false;
      
      // Check if the user owns this material
      return ownedMaterialIds.includes(material.id);
    });
  };
  
  // Add this new component near the top of the file, after the imports:
  const ObservationTooltip = ({ observation }: { observation: Activity['lastObservation'] }) => {
    if (!observation) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
        <div className="space-y-2">
          {observation.engagementLevel && (
            <div className="flex items-center text-sm">
              <span className="font-medium text-gray-700">Engagement:</span>
              <span className="ml-2 capitalize text-gray-600">{observation.engagementLevel}</span>
            </div>
          )}
          {observation.interestLevel && (
            <div className="flex items-center text-sm">
              <span className="font-medium text-gray-700">Interest:</span>
              <span className="ml-2 capitalize text-gray-600">{observation.interestLevel}</span>
            </div>
          )}
          {observation.completionDifficulty && (
            <div className="flex items-center text-sm">
              <span className="font-medium text-gray-700">Difficulty:</span>
              <span className="ml-2 capitalize text-gray-600">{observation.completionDifficulty}</span>
            </div>
          )}
          {observation.notes && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Notes:</span>
              <p className="mt-1 text-gray-600 line-clamp-2">{observation.notes}</p>
            </div>
          )}
          {observation.skillsDemonstrated && observation.skillsDemonstrated.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Skills:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {observation.skillsDemonstrated.map((skill, index) => (
                  <span key={index} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
                ${day.isRestDay ? 'opacity-75 bg-gray-50' : ''}
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
          <WeeklyPlanEmptyState
            childId={selectedChild.id}
            childName={selectedChild.name}
            onGeneratePlan={handleGeneratePlan}
            isGenerating={isGeneratingPlan}
          />
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
                          <div className="relative group">
                            <span className="flex items-center text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full text-xs cursor-help">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {activity.lastObservedDate ? (
                                <>Last observed: {formatObservedDate(activity.lastObservedDate)}</>
                              ) : (
                                <>Observed</>
                              )}
                            </span>
                            {activity.lastObservation && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                <ObservationTooltip observation={activity.lastObservation} />
                              </div>
                            )}
                          </div>
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
                      Rest Day
                    </p>
                    <p className="text-gray-500 text-sm">
                      No activities scheduled for {format(selectedDate, 'EEEE')} based on your preferences.
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