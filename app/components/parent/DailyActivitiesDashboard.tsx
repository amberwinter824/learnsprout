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
  skills: string[];
  skillDescriptions?: Record<string, string>;
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
    fetchActivities(currentDate);
  }, [childId, userId, currentDate]);

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
                    order: activity.order,
                    skills: activityData.skills || []
                  };
                }
                
                return {
                  id: `${expectedPlanId}_${dayOfWeek}_${activity.activityId}`,
                  activityId: activity.activityId,
                  title: 'Unknown Activity',
                  status: activity.status,
                  timeSlot: activity.timeSlot,
                  order: activity.order,
                  skills: []
                };
              } catch (error) {
                console.error(`Error fetching activity ${activity.activityId}:`, error);
                return {
                  id: `${expectedPlanId}_${dayOfWeek}_${activity.activityId}`,
                  activityId: activity.activityId,
                  title: 'Error Loading Activity',
                  status: activity.status,
                  skills: []
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
    const newDate = addDays(currentDate, days);
    setCurrentDate(newDate);
    
    // Re-fetch activities for the new date
    fetchActivities(newDate);
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

  // Add a separate fetchActivities function that takes a date parameter
  const fetchActivities = async (date: Date) => {
    if (!childId || !userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Format the date for querying
      const dateString = format(date, 'yyyy-MM-dd');
      const dayOfWeek = format(date, 'EEEE').toLowerCase();
      
      // Find the weekly plan that contains this date
      const weekPlansQuery = query(
        collection(db, 'weeklyPlans'),
        where('childId', '==', childId),
        where('userId', '==', userId)
      );
      
      const weekPlansSnapshot = await getDocs(weekPlansQuery);
      let foundActivities: Activity[] = [];
      let foundWeekPlanId: string | null = null;
      
      // Look through all weekly plans to find activities for this date
      for (const doc of weekPlansSnapshot.docs) {
        const planData = doc.data();
        const planStartDate = planData.startDate?.toDate ? 
          planData.startDate.toDate() : 
          new Date(planData.startDate);
        
        // Check if this plan contains our target date
        if (planData[dayOfWeek] && Array.isArray(planData[dayOfWeek])) {
          foundActivities = planData[dayOfWeek];
          foundWeekPlanId = doc.id;
          break;
        }
      }
      
      setWeekPlanId(foundWeekPlanId);
      setActivities(foundActivities);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities. Please try again.');
      setLoading(false);
    }
  };

  // Helper function to get skill descriptions
  const getSkillDescription = (skillId: string): string => {
    const descriptions: Record<string, string> = {
      'fine_motor': 'Fine motor skills involve the coordination of small muscles in the hands and fingers. These skills are essential for writing, drawing, and self-care tasks.',
      'gross_motor': 'Gross motor skills involve large muscle movements and coordination. These skills are important for walking, running, jumping, and overall physical development.',
      'cognitive': 'Cognitive skills include thinking, problem-solving, and understanding concepts. These skills form the foundation for academic learning.',
      'language': 'Language skills involve communication, vocabulary, and understanding. These skills are fundamental for expressing needs and learning.',
      'social': 'Social skills include interacting with others, sharing, and understanding social cues. These skills are crucial for building relationships.',
      'emotional': 'Emotional skills involve self-awareness and managing feelings. These skills help children understand and express their emotions appropriately.',
      'sensory': 'Sensory skills involve processing and responding to different sensory inputs. These skills help children understand and interact with their environment.',
      'adaptive': 'Adaptive skills include self-care and daily living activities. These skills help children become more independent.',
      'play': 'Play skills involve imagination, creativity, and social play. These skills support learning and social interaction.'
    };
    return descriptions[skillId] || 'This skill is important for your child\'s development.';
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
    <div className="space-y-6">
      {/* Header with date navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
            <h2 className="text-lg font-medium">Daily Activities</h2>
          </div>
          
          {/* Date navigation */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {childName}'s Activities
            </h3>
            
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
                {isToday(currentDate) ? 'Today' : format(currentDate, 'EEEE, MMMM d')}
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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Observation</h3>
            
            {/* Pre-Activity Context */}
            <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Developmental Focus</h4>
              <div className="space-y-3">
                {selectedActivity.skills.map(skillId => (
                  <div key={skillId} className="flex items-start">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        {skillId.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </p>
                      <p className="text-sm text-blue-700">
                        {getSkillDescription(skillId)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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
            childId={childId}
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

      {/* Activity Recording Form */}
      {showQuickObserve && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Impact</h3>
          
          {/* Post-Activity Reflection */}
          {submittingObservation && (
            <div className="mt-6 bg-emerald-50 rounded-lg p-4 border border-emerald-100">
              <p className="text-sm text-emerald-700">
                By recording this activity, you're helping track your child's development in{' '}
                {selectedActivity?.skills?.length} key areas. This information helps us provide personalized recommendations and track progress over time.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}