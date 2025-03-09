"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  getActivity, 
  getAllActivities, 
  getWeeklyPlan,
  createWeeklyPlan, 
  updateWeeklyPlan
} from '@/lib/dataService';
import { 
  Plus, 
  X, 
  Calendar, 
  ArrowLeft, 
  ArrowRight, 
  Lightbulb, 
  CheckCircle,
  Circle, 
  Loader2
} from 'lucide-react';
import { generateWeeklyPlan } from '@/lib/planGenerator';
import { updateLastGeneratedTimestamp } from '@/lib/weeklyPlanService';
import ActivityDetailModal from '@/app/components/ActivityDetailModal';
import { ActivityObservationForm } from '@/app/components/ActivityObservationForm';
import ActivityCard from '@/app/components/ActivityCard';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

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
  id?: string;
  childId: string;
  userId: string;
  weekStarting: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
  monday: DayActivity[];
  tuesday: DayActivity[];
  wednesday: DayActivity[];
  thursday: DayActivity[];
  friday: DayActivity[];
  saturday: DayActivity[];
  sunday: DayActivity[];
  [key: string]: any;
}

type WeeklyPlanData = WeeklyPlan;

interface ActivityData {
  id: string;
  title: string;
  description?: string;
  area?: string;
  ageRanges?: string[];
  duration?: number;
  difficulty?: string;
  materialsNeeded?: string[];
  skillsAddressed?: string[];
  [key: string]: any;
}

interface SelectedActivityForObservation {
  activityId: string;
  id: string;
  day: string;
  index: number;
}

// Helper function to safely convert any date type to a Date object
function safelyGetDateObject(dateValue: any): Date {
  if (!dateValue) return new Date();
  
  // If it's a Timestamp with toDate method
  if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
    return dateValue.toDate();
  }
  
  // If it's already a Date object
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  // Handle string dates (YYYY-MM-DD)
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateValue + 'T00:00:00'); // Add time to avoid timezone issues
  }
  
  // Fallback for other cases
  return new Date(dateValue);
}

// Convert any date type to a YYYY-MM-DD string format
function formatDateToString(dateValue: any): string {
  const date = safelyGetDateObject(dateValue);
  return date.toISOString().split('T')[0];
}

export default function WeeklyPlanView({ childId, weeklyPlanId, userId }: WeeklyPlanViewProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('morning');
  const [showAddActivity, setShowAddActivity] = useState<boolean>(false);
  const [currentWeekStarting, setCurrentWeekStarting] = useState<Date>(getStartOfWeek(new Date()));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  const [activityDetails, setActivityDetails] = useState<Record<string, ActivityData>>({});
  const [generatingPlan, setGeneratingPlan] = useState<boolean>(false);
  const [showAddObservation, setShowAddObservation] = useState<boolean>(false);
  const [selectedActivityForObservation, setSelectedActivityForObservation] = useState<SelectedActivityForObservation | null>(null);

  // Initialize days and time slots
  const daysArray: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabelsArray: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlotsArray: string[] = ['morning', 'afternoon'];
  const timeSlotLabelsObj: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon' };

  // At the top of your component after your state declarations
  useEffect(() => {
    // Function to handle refreshing the weekly plan
    const handleActivityStatusChange = async () => {
      if (weeklyPlanId) {
        try {
          setLoading(true);
          // Refetch the weekly plan
          const planData = await getWeeklyPlan(weeklyPlanId);
          if (planData) {
            setWeeklyPlan(planData as WeeklyPlan);
          }
          setLoading(false);
        } catch (error) {
          console.error('Error refreshing weekly plan:', error);
          setLoading(false);
        }
      }
    };

    // Set up event listener for activity status changes
    window.addEventListener('activity-status-changed', handleActivityStatusChange);

    // Clean up event listener
    return () => {
      window.removeEventListener('activity-status-changed', handleActivityStatusChange);
    };
  }, [weeklyPlanId]);

  useEffect(() => {
    async function fetchData() {
      try {
        // If a plan ID is provided, fetch that specific plan
        if (weeklyPlanId) {
          const planData = await getWeeklyPlan(weeklyPlanId);
          if (planData) {
            setWeeklyPlan(planData as WeeklyPlan);
            
            // Update current week starting date
            setCurrentWeekStarting(safelyGetDateObject(planData.weekStarting));
          } else {
            setError('Weekly plan not found');
          }
        } else {
          // Initialize an empty weekly plan
          const emptyPlan: WeeklyPlan = {
            childId,
            userId: userId || '',
            weekStarting: formatDateToString(currentWeekStarting),
            createdBy: 'user',
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          };
          setWeeklyPlan(emptyPlan);
        }

        // Fetch all activities
        const activitiesData = await getAllActivities();
        setActivities(activitiesData as ActivityData[]);
        setLoading(false);
      } catch (error: any) {
        setError('Error fetching data: ' + error.message);
        setLoading(false);
      }
    }

    fetchData();
  }, [childId, currentWeekStarting, weeklyPlanId, userId]);

  // Fetch activity details as needed for the plan
  useEffect(() => {
    async function fetchActivityDetails() {
      if (!weeklyPlan) return;
      
      const allActivityIds = new Set<string>();
      daysArray.forEach(day => {
        (weeklyPlan[day] || []).forEach((activity: DayActivity) => {
          if (activity.activityId && !activityDetails[activity.activityId]) {
            allActivityIds.add(activity.activityId);
          }
        });
      });
      
      if (allActivityIds.size === 0) return;
      
      const detailsPromises = Array.from(allActivityIds).map(async (activityId) => {
        try {
          const activity = await getActivity(activityId);
          return [activityId, activity] as [string, ActivityData | null];
        } catch (error) {
          console.error(`Error fetching activity ${activityId}:`, error);
          return [activityId, null] as [string, null];
        }
      });
      
      const results = await Promise.all(detailsPromises);
      const newDetails: Record<string, ActivityData> = {};
      
      results.forEach(([id, activity]) => {
        if (activity) {
          newDetails[id] = activity;
        }
      });
      
      setActivityDetails(prev => ({ ...prev, ...newDetails }));
    }
    
    fetchActivityDetails();
  }, [weeklyPlan, activityDetails, daysArray]);

  // Get the start of the week (Monday) for a given date
  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
  }

  // Format date for display
  function formatDisplayDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Navigate to previous week
  function previousWeek(): void {
    const prevWeek = new Date(currentWeekStarting);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeekStarting(prevWeek);
    
    // Clear plan ID from URL and fetch plan for the new week
    router.push(`/dashboard/children/${childId}/weekly-plan?view=detailed`);
  }

  // Navigate to next week
  function nextWeek(): void {
    const nextWeek = new Date(currentWeekStarting);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekStarting(nextWeek);
    
    // Clear plan ID from URL and fetch plan for the new week
    router.push(`/dashboard/children/${childId}/weekly-plan?view=detailed`);
  }

  // Handle adding an activity to the weekly plan
  async function handleAddActivity(): Promise<void> {
    if (!selectedActivityId || !selectedDay || !selectedTimeSlot || !weeklyPlan) {
      return;
    }

    try {
      const activityToAdd = activities.find(activity => activity.id === selectedActivityId);
      if (!activityToAdd) return;

      const newActivity: DayActivity = {
        activityId: selectedActivityId,
        timeSlot: selectedTimeSlot,
        status: 'suggested',
        order: weeklyPlan[selectedDay].length // Add to the end
      };

      // Clone the current weekly plan and add the new activity
      const updatedWeeklyPlan = {
        ...weeklyPlan,
        [selectedDay]: [...weeklyPlan[selectedDay], newActivity]
      };

      // Ensure weekStarting is a string before saving
      if (updatedWeeklyPlan.weekStarting && typeof updatedWeeklyPlan.weekStarting !== 'string') {
        updatedWeeklyPlan.weekStarting = formatDateToString(updatedWeeklyPlan.weekStarting);
      }

      // Save the updated weekly plan
      if (weeklyPlan.id) {
        // Update existing plan
        await updateWeeklyPlan(weeklyPlan.id, updatedWeeklyPlan);
      } else {
        // Create new plan
        const planId = await createWeeklyPlan(updatedWeeklyPlan as WeeklyPlanData);
        updatedWeeklyPlan.id = planId;
      }

      setWeeklyPlan(updatedWeeklyPlan as WeeklyPlan);
      setShowAddActivity(false);
      setSelectedActivityId('');
      setSelectedDay('');
      
      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000); // Hide after 3 seconds
    } catch (error: any) {
      setError('Failed to add activity: ' + error.message);
    }
  }

  // Handle removing an activity from the weekly plan
  async function handleRemoveActivity(day: string, index: number): Promise<void> {
    if (!weeklyPlan) return;
    
    try {
      // Clone the current weekly plan and remove the activity
      const updatedDayActivities = [...weeklyPlan[day]];
      updatedDayActivities.splice(index, 1);

      const updatedWeeklyPlan = {
        ...weeklyPlan,
        [day]: updatedDayActivities
      };

      // Ensure weekStarting is a string before saving
      if (updatedWeeklyPlan.weekStarting && typeof updatedWeeklyPlan.weekStarting !== 'string') {
        updatedWeeklyPlan.weekStarting = formatDateToString(updatedWeeklyPlan.weekStarting);
      }

      // Save the updated weekly plan
      if (weeklyPlan.id) {
        await updateWeeklyPlan(weeklyPlan.id, updatedWeeklyPlan);
      } else {
        const planId = await createWeeklyPlan(updatedWeeklyPlan as WeeklyPlanData);
        updatedWeeklyPlan.id = planId;
      }

      setWeeklyPlan(updatedWeeklyPlan as WeeklyPlan);

      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000); // Hide after 3 seconds
    } catch (error: any) {
      setError('Failed to remove activity: ' + error.message);
    }
  }

  // Handle updating activity status
  async function handleUpdateActivityStatus(day: string, index: number, newStatus: 'suggested' | 'confirmed' | 'completed'): Promise<void> {
    if (!weeklyPlan) return;
    
    try {
      // Clone the current weekly plan and update the activity
      const updatedDayActivities = [...weeklyPlan[day]];
      updatedDayActivities[index] = {
        ...updatedDayActivities[index],
        status: newStatus
      };

      const updatedWeeklyPlan = {
        ...weeklyPlan,
        [day]: updatedDayActivities
      };

      // Ensure weekStarting is a string before saving
      if (updatedWeeklyPlan.weekStarting && typeof updatedWeeklyPlan.weekStarting !== 'string') {
        updatedWeeklyPlan.weekStarting = formatDateToString(updatedWeeklyPlan.weekStarting);
      }

      // Save the updated weekly plan
      if (weeklyPlan.id) {
        await updateWeeklyPlan(weeklyPlan.id, updatedWeeklyPlan);
      } else {
        const planId = await createWeeklyPlan(updatedWeeklyPlan as WeeklyPlanData);
        updatedWeeklyPlan.id = planId;
      }

      setWeeklyPlan(updatedWeeklyPlan as WeeklyPlan);

      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000); // Hide after 3 seconds
    } catch (error: any) {
      setError('Failed to update activity status: ' + error.message);
    }
  }
  
  // Handle generating a recommended plan
  async function handleGenerateRecommendedPlan(): Promise<void> {
    if (!childId || !userId) {
      setError('User authentication or child information is missing');
      return;
    }
    
    try {
      setGeneratingPlan(true);
      setError('');
      
      // Generate a new plan
      const newPlan = await generateWeeklyPlan(childId, userId);
      
      // Update the lastPlanGenerated timestamp on the child profile
      await updateLastGeneratedTimestamp(childId);
      
      // Update state with the new plan
      setWeeklyPlan(newPlan as unknown as WeeklyPlan);
      
      // Update URL with the plan ID for better sharing/bookmarking
      if (newPlan.id) {
        router.push(`/dashboard/children/${childId}/weekly-plan?planId=${newPlan.id}&view=detailed`);
      }
      
      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error generating plan:', error);
      setError('Failed to generate recommended plan: ' + error.message);
    } finally {
      setGeneratingPlan(false);
    }
  }
  
  // Handle selecting an activity for observation
  function handleAddObservation(activityId: string, day: string, index: number): void {
    setSelectedActivityForObservation({
      activityId,
      id: activityId,
      day,
      index
    });
    setShowAddObservation(true);
  }
  
  // Handle after observation is recorded
  function handleObservationRecorded(): void {
    setShowAddObservation(false);
    
    // Update the activity status to completed
    if (selectedActivityForObservation) {
      handleUpdateActivityStatus(
        selectedActivityForObservation.day,
        selectedActivityForObservation.index,
        'completed'
      );
    }
  }

  // Filter activities based on search term
  const filteredActivities = activities.filter(activity =>
    activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (activity.description && activity.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get area color class for an activity
  function getAreaColorClass(area?: string): string {
    switch(area) {
      case 'practical_life': return 'bg-blue-100 text-blue-700';
      case 'sensorial': return 'bg-purple-100 text-purple-700';
      case 'language': return 'bg-green-100 text-green-700';
      case 'mathematics': return 'bg-red-100 text-red-700';
      case 'cultural': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  // Get area label
  function getAreaLabel(area?: string): string {
    switch(area) {
      case 'practical_life': return 'Practical Life';
      case 'sensorial': return 'Sensorial';
      case 'language': return 'Language';
      case 'mathematics': return 'Mathematics';
      case 'cultural': return 'Cultural';
      default: return area || 'Unknown';
    }
  }
  
  // Get status badge for an activity
  function StatusBadge({ status }: { status: string }): React.ReactElement {
    if (status === 'completed') {
      return (
        <span className="flex items-center text-xs font-medium text-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </span>
      );
    } else if (status === 'confirmed') {
      return (
        <span className="flex items-center text-xs font-medium text-blue-600">
          <Circle className="h-3 w-3 mr-1 fill-blue-600" />
          Confirmed
        </span>
      );
    } else {
      return (
        <span className="flex items-center text-xs font-medium text-gray-600">
          <Circle className="h-3 w-3 mr-1" />
          Suggested
        </span>
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin h-12 w-12 text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div>
      {/* Success message */}
      {showSaveSuccess && (
        <div className="mb-4 bg-green-50 text-green-700 p-4 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Weekly plan updated successfully!
        </div>
      )}

      {/* Week navigation */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <button 
            onClick={previousWeek}
            className="p-2 rounded-md hover:bg-gray-100"
            disabled={loading}
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Week of {formatDisplayDate(currentWeekStarting)}
            </h3>
          </div>
          <button 
            onClick={nextWeek}
            className="p-2 rounded-md hover:bg-gray-100"
            disabled={loading}
          >
            <ArrowRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>
      
      {/* Generate Plan button */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center">
          <Lightbulb className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Plan Recommendations</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Generate a personalized weekly plan based on developmental needs,
            interests, and progress. The system will analyze previous activities, engagement levels,
            and skills to recommend the most suitable activities.
          </p>
          <div className="flex justify-end">
            <button
              onClick={handleGenerateRecommendedPlan}
              disabled={generatingPlan}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {generatingPlan ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Generating Recommendations...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate Recommended Plan
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Weekly plan grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Weekly Activities</h3>
          <button
            onClick={() => setShowAddActivity(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Plus className="-ml-1 mr-1 h-4 w-4" />
            Add Activity
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="grid grid-cols-7 gap-4 min-w-max">
            {daysArray.map((day, index) => (
              <div key={day} className="border rounded-lg overflow-hidden w-64">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="font-medium text-gray-700">{dayLabelsArray[index]}</h4>
                </div>
                <div className="p-3 divide-y">
                  {timeSlotsArray.map(timeSlot => (
                    <div key={timeSlot} className="py-2">
                      <div className="font-medium text-xs text-gray-500 mb-2">
                        {timeSlotLabelsObj[timeSlot]}
                      </div>
                      {weeklyPlan && weeklyPlan[day]
                        ?.filter((activity: { timeSlot: string; }) => activity.timeSlot === timeSlot)
                        .map((activity: DayActivity, activityIndex: number) => (
                          <div key={`${activity.activityId}-${activityIndex}`} className="mb-2">
                            <ActivityCard
                              activity={activity}
                              activityData={activityDetails[activity.activityId]}
                              day={day}
                              childId={childId}
                              weeklyPlanId={weeklyPlan?.id}
                              onStatusChange={() => {
                                // Refetch the weekly plan data after status change
                                if (weeklyPlan.id) {
                                  getWeeklyPlan(weeklyPlan.id).then(plan => {
                                    if (plan) setWeeklyPlan(plan as WeeklyPlan);
                                  });
                                }
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Add Activity Modal */}
{showAddActivity && (
  <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg p-6 max-w-lg w-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium text-gray-900">Add Activity</h3>
        <button
          onClick={() => setShowAddActivity(false)}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="searchActivities" className="block text-sm font-medium text-gray-700">
            Search Activities
          </label>
          <input
            type="text"
            id="searchActivities"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            placeholder="Search by title or description..."
          />
        </div>

        <div>
          <label htmlFor="day" className="block text-sm font-medium text-gray-700">
            Day
          </label>
          <select
            id="day"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          >
            <option value="">Select a day</option>
            {daysArray.map((day: string) => (
              <option key={day} value={day.toLowerCase()}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="timeSlot" className="block text-sm font-medium text-gray-700">
            Time Slot
          </label>
          <select
            id="timeSlot"
            value={selectedTimeSlot}
            onChange={(e) => setSelectedTimeSlot(e.target.value as 'morning' | 'afternoon' | 'evening')}
            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </div>

        <div className="max-h-60 overflow-y-auto border rounded-md">
          {filteredActivities.map((activity: ActivityData) => (
            <div
              key={activity.id}
              className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                selectedActivityId === activity.id ? 'bg-emerald-50' : ''
              }`}
              onClick={() => setSelectedActivityId(activity.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{activity.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getAreaColorClass(activity.area || '')}`}>
                    {activity.area?.replace('_', ' ') || 'Other'}
                  </span>
                </div>
                {activity.duration && (
                  <span className="text-xs text-gray-500">
                    {activity.duration} min
                  </span>
                )}
              </div>
              {activity.description && (
                <p className="mt-1 text-sm text-gray-500">{activity.description}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={() => setShowAddActivity(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddActivity}
            disabled={!selectedActivityId || !selectedDay}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 border border-transparent rounded-md hover:bg-emerald-600 disabled:opacity-50"
          >
            Add Activity
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Add Observation Modal */}
{showAddObservation && selectedActivityForObservation && (
  <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-start p-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">Record Observation</h3>
        <button
          onClick={() => setShowAddObservation(false)}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
     
      <div className="p-4">
        <ActivityObservationForm
          activityId={selectedActivityForObservation.activityId}
          childId={childId}
          onSuccess={handleObservationRecorded}
          onClose={() => setShowAddObservation(false)}
          weeklyPlanId={weeklyPlanId || ''}
          dayOfWeek={selectedActivityForObservation.day}
        />
      </div>
    </div>
  </div>
)}
</div>
);
}