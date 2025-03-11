// app/components/parent/DailyActivitiesDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Star, 
  ChevronRight, 
  Smile, 
  Meh, 
  Frown, 
  Camera, 
  X,
  Loader2,
  CalendarDays,
  BookOpen,
  Info
} from 'lucide-react';
import { format, isToday, parseISO, addDays, isSameDay } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, serverTimestamp, addDoc, Timestamp } from 'firebase/firestore';
import ActivityDetailsPopup from './ActivityDetailsPopup';

// Define types for our component
interface Activity {
  id: string;
  activityId: string;
  title: string;
  description?: string;
  duration?: number;
  area?: string;
  status: 'suggested' | 'confirmed' | 'completed';
  isHomeSchoolConnection?: boolean;
  timeSlot?: string;
  order?: number;
}

interface PendingObservation {
  activityId: string;
  note: string;
  engagement: 'low' | 'medium' | 'high';
  selectedSkills: string[];
}

interface DailyActivitiesDashboardProps {
  childId: string;
  childName: string;
  userId: string;
  selectedDate?: Date; // For selected date
  onWeeklyViewRequest?: (childId: string) => void; // New callback prop for view switching
}

export default function DailyActivitiesDashboard({ 
  childId, 
  childName,
  userId,
  selectedDate,
  onWeeklyViewRequest
}: DailyActivitiesDashboardProps) {
  // Activity state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  // Date and view state
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate || new Date());
  const [weekPlanId, setWeekPlanId] = useState<string | null>(null);
  
  // Quick observation form state
  const [showQuickObserve, setShowQuickObserve] = useState(false);
  const [observationNote, setObservationNote] = useState('');
  const [observationEngagement, setObservationEngagement] = useState<'low' | 'medium' | 'high'>('medium');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submittingObservation, setSubmittingObservation] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  // Activity details popup
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [detailsActivityId, setDetailsActivityId] = useState<string | null>(null);
  
  // Simple skill options
  const skillOptions = [
    { id: 'concentration', name: 'Concentration' },
    { id: 'independence', name: 'Independence' },
    { id: 'coordination', name: 'Coordination' },
    { id: 'confidence', name: 'Confidence' },
    { id: 'communication', name: 'Communication' },
  ];

  // Update currentDate when selectedDate prop changes
  useEffect(() => {
    if (selectedDate && !isSameDay(selectedDate, currentDate)) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate, currentDate]);

  // Fetch activities for the current date
  useEffect(() => {
    // Track if component is mounted to prevent state updates after unmounting
    let isMounted = true;
    // Track if we're currently generating a plan to prevent loops
    let isGeneratingPlan = false;
    
    const fetchActivities = async () => {
      try {
        if (isMounted) setLoading(true);
        
        // Format date for query
        const dateString = format(currentDate, 'yyyy-MM-dd');
        const dayOfWeek = format(currentDate, 'EEEE').toLowerCase();
        
        // Query for the weekly plan for this child and week
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
        const weekStartString = format(weekStart, 'yyyy-MM-dd');
        
        const plansQuery = query(
          collection(db, 'weeklyPlans'),
          where('childId', '==', childId),
          where('weekStarting', '==', weekStartString)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        
        // If no plan exists, generate one automatically (but only if not already generating)
        if (plansSnapshot.empty && !isGeneratingPlan) {
          console.log('No weekly plan found, generating one...');
          isGeneratingPlan = true;
          try {
            await generateDailyActivities();
            // After generating, we'll fetch activities in a separate call
            if (isMounted) setLoading(false);
            return;
          } catch (genError) {
            console.error('Error in plan generation:', genError);
            if (isMounted) {
              setError('Failed to generate weekly plan');
              setLoading(false);
            }
            return;
          } finally {
            isGeneratingPlan = false;
          }
        }
        
        // If we have plans, continue with existing logic
        if (!plansSnapshot.empty) {
          // Use the first plan (should only be one per week)
          const planDoc = plansSnapshot.docs[0];
          const planData = planDoc.data();
          const planId = planDoc.id;
          if (isMounted) setWeekPlanId(planId);
          
          // Get activities for today
          const dayActivities = planData[dayOfWeek] || [];
          
          if (dayActivities.length === 0) {
            console.log(`No activities for ${dayOfWeek}, plan may need updating`);
            if (isMounted) {
              setActivities([]);
              setLoading(false);
            }
            return;
          }
          
          // Get full activity details
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
                
                // If activity not found, return with basic info
                return {
                  id: `${planId}_${dayOfWeek}_${activity.activityId}`,
                  activityId: activity.activityId,
                  title: 'Unknown Activity',
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
                  status: activity.status
                };
              }
            })
          );
          
          if (isMounted) {
            setActivities(activitiesWithDetails.sort((a, b) => (a.order || 0) - (b.order || 0)));
            setLoading(false);
          }
        } else {
          // No plans and not generating
          if (isMounted) {
            setActivities([]);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
        if (isMounted) {
          setError('Failed to load daily activities');
          setLoading(false);
        }
      }
    };
    
    if (childId) {
      fetchActivities();
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [childId, currentDate, userId]);

  // Generate activities if none exist
  const generateDailyActivities = async () => {
    try {
      setLoading(true);
      
      // Use planGenerator to create a new weekly plan
      const { generateWeeklyPlan } = await import('@/lib/planGenerator');
      
      // Generate a unique plan ID to use for checking if it already exists
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
      const weekStartString = format(weekStart, 'yyyy-MM-dd');
      const expectedPlanId = `${childId}_${weekStartString}`;
      
      // Check if this plan already exists (to avoid duplicate creation)
      const existingPlanDoc = await getDoc(doc(db, 'weeklyPlans', expectedPlanId));
      
      if (existingPlanDoc.exists()) {
        console.log(`Plan ${expectedPlanId} already exists, using existing plan`);
        const planData = existingPlanDoc.data();
        setWeekPlanId(expectedPlanId);
        
        // Fetch activities for the current day
        const dayOfWeek = format(currentDate, 'EEEE').toLowerCase();
        const dayActivities = planData[dayOfWeek] || [];
        
        // Get activity details and update state
        if (dayActivities.length > 0) {
          const activitiesWithDetails = await Promise.all(
            dayActivities.map(async (activity: any) => {
              try {
                const activityDoc = await getDoc(doc(db, 'activities', activity.activityId));
                
                if (activityDoc.exists()) {
                  const activityData = activityDoc.data();
                  return {
                    id: `${expectedPlanId}_${dayOfWeek}_${activity.activityId}`,
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
                
                return {
                  id: `${expectedPlanId}_${dayOfWeek}_${activity.activityId}`,
                  activityId: activity.activityId,
                  title: 'Unknown Activity',
                  status: activity.status,
                  timeSlot: activity.timeSlot,
                  order: activity.order
                };
              } catch (error) {
                console.error(`Error fetching activity ${activity.activityId}:`, error);
                return {
                  id: `${expectedPlanId}_${dayOfWeek}_${activity.activityId}`,
                  activityId: activity.activityId,
                  title: 'Error Loading Activity',
                  status: activity.status
                };
              }
            })
          );
          
          setActivities(activitiesWithDetails.sort((a, b) => (a.order || 0) - (b.order || 0)));
        } else {
          setActivities([]);
        }
        
        setLoading(false);
        return;
      }
      
      // If no existing plan, generate a new one
      console.log(`Generating new plan with ID ${expectedPlanId}`);
      const newPlan = await generateWeeklyPlan(childId, userId);
      
      if (newPlan && newPlan.id) {
        console.log(`Successfully generated new weekly plan with ID: ${newPlan.id}`);
        setWeekPlanId(newPlan.id);
        
        // Clear loading state and initiate a clean fetch in the next cycle
        setLoading(false);
        
        // After a brief delay, refresh the component to fetch the new plan's activities
        setTimeout(() => {
          // This will force the component to re-render and fetch activities
          setCurrentDate(new Date(currentDate));
        }, 500);
      } else {
        throw new Error("Failed to generate plan - no plan ID returned");
      }
    } catch (error) {
      console.error('Error generating activities:', error);
      setError('Failed to generate activities');
      setLoading(false);
    }
  };
  
  // Go to next/previous day
  const handleDateChange = (days: number) => {
    setCurrentDate(prev => addDays(prev, days));
  };
  
  // Handle request to view weekly view
  const handleWeeklyViewRequest = () => {
    // Use the callback if provided, otherwise navigate directly
    if (onWeeklyViewRequest) {
      onWeeklyViewRequest(childId);
    } else {
      // Direct navigation as a fallback
      window.location.href = `/dashboard/children/${childId}/weekly-plan`;
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
  
  // Mark activity as complete
  const markComplete = async (activity: Activity) => {
    if (!weekPlanId) {
      console.error("Weekly plan ID not available");
      return;
    }
    
    try {
      // Optimistically update UI
      setActivities(prev => 
        prev.map(act => 
          act.activityId === activity.activityId ? {...act, status: 'completed'} : act
        )
      );
      
      // Show observation form
      setSelectedActivity(activity);
      setShowQuickObserve(true);
      
      // Update in database
      const planRef = doc(db, 'weeklyPlans', weekPlanId);
      const dayOfWeek = format(currentDate, 'EEEE').toLowerCase();
      
      // Get current plan data
      const planDoc = await getDoc(planRef);
      if (!planDoc.exists()) {
        throw new Error('Weekly plan not found');
      }
      
      const planData = planDoc.data();
      
      // Update activity status
      const dayActivities = planData[dayOfWeek] || [];
      const updatedActivities = dayActivities.map((act: any) => 
        act.activityId === activity.activityId ? {...act, status: 'completed'} : act
      );
      
      // Save updated plan
      await updateDoc(planRef, {
        [dayOfWeek]: updatedActivities,
        updatedAt: serverTimestamp()
      });
      
      console.log(`Activity ${activity.activityId} marked as completed`);
    } catch (error) {
      console.error('Error marking activity as complete:', error);
      
      // Revert optimistic update if there was an error
      setActivities(prev => 
        prev.map(act => 
          act.activityId === activity.activityId && act.status === 'completed'
            ? {...act, status: 'suggested'} 
            : act
        )
      );
    }
  };
  
  // Handle photo capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setPhotoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Reset photo state
  const handleClearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };
  
  // Toggle skill selection
  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId) 
        : [...prev, skillId]
    );
  };
  
  // Submit observation
  const submitObservation = async () => {
    if (!selectedActivity) return;
    
    try {
      setSubmittingObservation(true);
      
      // Prepare observation data
      const observationData = {
        childId,
        activityId: selectedActivity.activityId,
        date: new Date(),
        completionStatus: 'completed',
        engagementLevel: observationEngagement,
        interestLevel: observationEngagement, // Use same value for now
        completionDifficulty: 
          observationEngagement === 'high' ? 'easy' : 
          observationEngagement === 'medium' ? 'appropriate' : 'challenging',
        notes: observationNote,
        skillsDemonstrated: selectedSkills,
        environmentContext: 'home',
        observationType: 'general',
        visibility: ['all'], // Visible to all
        weekPlanId,
        dayOfWeek: format(currentDate, 'EEEE').toLowerCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add progress record
      await addDoc(collection(db, 'progressRecords'), observationData);
      
      // Reset form
      setShowQuickObserve(false);
      setSelectedActivity(null);
      setObservationNote('');
      setObservationEngagement('medium');
      setPhotoFile(null);
      setPhotoPreview(null);
      setSelectedSkills([]);
      
      console.log('Observation recorded successfully');
    } catch (error) {
      console.error('Error recording observation:', error);
    } finally {
      setSubmittingObservation(false);
    }
  };
  
  // Format date for display
  const formatDateDisplay = (date: Date) => {
    if (isToday(date)) {
      return 'Today';
    }
    return format(date, 'EEEE, MMMM d');
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
            onClick={handleWeeklyViewRequest}
            className="flex items-center text-sm text-emerald-600 hover:text-emerald-700"
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Weekly View
          </button>
          
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
      
      {/* Main content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {/* Quick observation form */}
        {showQuickObserve && selectedActivity && (
          <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-medium text-gray-900">Quick Observation</h3>
              <button
                onClick={() => {
                  setShowQuickObserve(false);
                  setSelectedActivity(null);
                }}
                className="text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-3">
              <div className="text-sm text-gray-500 mb-1">Activity</div>
              <div className="font-medium">{selectedActivity?.title}</div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">How did it go?</div>
              <div className="flex justify-between text-center">
                <button
                  onClick={() => setObservationEngagement('low')}
                  className={`flex-1 py-2 px-1 rounded-l-lg flex flex-col items-center ${
                    observationEngagement === 'low' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                  }`}
                  type="button"
                >
                  <Frown className={`h-6 w-6 mb-1 ${observationEngagement === 'low' ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className="text-xs">Challenging</span>
                </button>
                
                <button
                  onClick={() => setObservationEngagement('medium')}
                  className={`flex-1 py-2 px-1 border-x border-white flex flex-col items-center ${
                    observationEngagement === 'medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'
                  }`}
                  type="button"
                >
                  <Meh className={`h-6 w-6 mb-1 ${observationEngagement === 'medium' ? 'text-yellow-500' : 'text-gray-400'}`} />
                  <span className="text-xs">OK</span>
                </button>
                
                <button
                  onClick={() => setObservationEngagement('high')}
                  className={`flex-1 py-2 px-1 rounded-r-lg flex flex-col items-center ${
                    observationEngagement === 'high' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                  }`}
                  type="button"
                >
                  <Smile className={`h-6 w-6 mb-1 ${observationEngagement === 'high' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="text-xs">Great</span>
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">Quick note (optional)</div>
              <textarea
                value={observationNote}
                onChange={(e) => setObservationNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="What did you notice? Any interesting moments?"
                rows={2}
              />
            </div>
            
            <div className="mb-4">
              <div className="flex items-center">
                <label className="flex items-center justify-center w-full py-2 bg-gray-50 hover:bg-gray-100 rounded-md cursor-pointer">
                  <Camera className="h-5 w-5 mr-2 text-gray-500" />
                  <span className="text-sm">Take a photo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoCapture} 
                    capture="environment"
                  />
                </label>
              </div>
              
              {photoPreview && (
                <div className="mt-2 relative inline-block">
                  <img 
                    src={photoPreview || ''} 
                    alt="Preview" 
                    className="h-20 w-20 object-cover rounded-md border border-gray-200"
                  />
                  <button
                    onClick={handleClearPhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">Skills observed (optional)</div>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => handleSkillToggle(skill.id)}
                    className={`px-2 py-1 rounded-full text-xs ${
                      selectedSkills.includes(skill.id)
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                    type="button"
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={submitObservation}
                disabled={submittingObservation}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md flex items-center disabled:opacity-50"
                type="button"
              >
                {submittingObservation ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Save Observation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {/* Activity list */}
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map(activity => (
              <div 
                key={activity.id}
                className={`border rounded-lg overflow-hidden ${
                  activity.status === 'completed' ? 'border-green-300 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div 
                  className="p-3 cursor-pointer"
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{activity.title}</h3>
                      {activity.description && (
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      )}
                    </div>
                    {activity.status === 'completed' ? (
                      <span className="flex items-center text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </span>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsActivityId(activity.activityId);
                            setShowDetailsPopup(true);
                          }}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm"
                          type="button"
                        >
                          <Info className="h-3 w-3 inline mr-1" />
                          How To
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markComplete(activity);
                          }}
                          className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1 rounded text-sm"
                          type="button"
                        >
                          Mark Done
                        </button>
                      </div>
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
                      <Star className="h-4 w-4 mr-1" />
                      View Notes
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
            <Calendar className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No activities for this day</h3>
            <p className="text-gray-500 text-sm mb-4">
              {isToday(currentDate) ? 
                "We don't have any activities planned for today yet." :
                `No activities were found for ${format(currentDate, 'MMMM d, yyyy')}.`
              }
            </p>
            <button
              onClick={generateDailyActivities}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md"
            >
              Generate Activities
            </button>
          </div>
        )}
        
        {/* Render the activity details popup */}
        {showDetailsPopup && detailsActivityId && (
          <ActivityDetailsPopup 
            activityId={detailsActivityId || ''} 
            onClose={() => setShowDetailsPopup(false)}
          />
        )}
        
        {/* Navigation to weekly view */}
        <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="text-gray-500 text-sm">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <button
            onClick={handleWeeklyViewRequest}
            className="flex items-center text-sm text-emerald-600 hover:text-emerald-700"
          >
            View Weekly Calendar
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}