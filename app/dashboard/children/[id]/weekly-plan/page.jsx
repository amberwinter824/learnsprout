// app/dashboard/children/[id]/weekly-plan/page.jsx
"use client"
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  getChild, 
  getActivity, 
  getAllActivities, 
  getCurrentWeeklyPlan, 
  createWeeklyPlan, 
  updateWeeklyPlan,
  getWeeklyPlan
} from '@/lib/dataService';
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Info, 
  Calendar, 
  ArrowRight, 
  ArrowLeftIcon, 
  Clock, 
  File, 
  Lightbulb, 
  CheckCircle,
  Circle, 
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { generateWeeklyPlan } from '@/lib/planGenerator';

export default function WeeklyPlanPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id: childId } = params;
  const planIdFromUrl = searchParams.get('planId');
  const activityIdFromUrl = searchParams.get('activityId');
  
  const { currentUser } = useAuth();
  
  const [child, setChild] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState(activityIdFromUrl || '');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('morning');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [currentWeekStarting, setCurrentWeekStarting] = useState(getStartOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [activityDetails, setActivityDetails] = useState({});
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showAddObservation, setShowAddObservation] = useState(false);
  const [selectedActivityForObservation, setSelectedActivityForObservation] = useState(null);

  // Initialize days and time slots
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = ['morning', 'afternoon'];
  const timeSlotLabels = { morning: 'Morning', afternoon: 'Afternoon' };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch child data
        const childData = await getChild(childId);
        if (!childData) {
          setError('Child not found');
          setLoading(false);
          return;
        }
        setChild(childData);

        // If a plan ID is provided, fetch that specific plan
        if (planIdFromUrl) {
          const planData = await getWeeklyPlan(planIdFromUrl);
          if (planData) {
            setWeeklyPlan(planData);
            
            // Update current week starting date based on the plan
            if (planData.weekStarting) {
              const weekStartDate = planData.weekStarting.toDate 
                ? planData.weekStarting.toDate() 
                : new Date(planData.weekStarting);
              setCurrentWeekStarting(weekStartDate);
            }
          } else {
            setError('Weekly plan not found');
          }
        } else {
          // Fetch weekly plan for the current week
          const weeklyPlanData = await getCurrentWeeklyPlan(
            childId,
            currentWeekStarting
          );

          if (weeklyPlanData) {
            setWeeklyPlan(weeklyPlanData);
          } else {
            // Initialize an empty weekly plan
            const emptyPlan = {
              childId,
              weekStarting: currentWeekStarting,
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
        }

        // Fetch all activities
        const activitiesData = await getAllActivities();
        setActivities(activitiesData);

        // If there's an activity ID in the URL, show the add activity modal
        if (activityIdFromUrl) {
          setShowAddActivity(true);
          setSelectedDay('monday'); // Default to Monday
        }
      } catch (error) {
        setError('Error fetching data: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [childId, currentWeekStarting, activityIdFromUrl, planIdFromUrl]);

  // Fetch activity details as needed for the plan
  useEffect(() => {
    async function fetchActivityDetails() {
      if (!weeklyPlan) return;
      
      const allActivityIds = new Set();
      days.forEach(day => {
        (weeklyPlan[day] || []).forEach(activity => {
          if (activity.activityId && !activityDetails[activity.activityId]) {
            allActivityIds.add(activity.activityId);
          }
        });
      });
      
      if (allActivityIds.size === 0) return;
      
      const detailsPromises = Array.from(allActivityIds).map(async (activityId) => {
        try {
          const activity = await getActivity(activityId);
          return [activityId, activity];
        } catch (error) {
          console.error(`Error fetching activity ${activityId}:`, error);
          return [activityId, null];
        }
      });
      
      const results = await Promise.all(detailsPromises);
      const newDetails = {};
      
      results.forEach(([id, activity]) => {
        if (activity) {
          newDetails[id] = activity;
        }
      });
      
      setActivityDetails(prev => ({ ...prev, ...newDetails }));
    }
    
    fetchActivityDetails();
  }, [weeklyPlan, activityDetails]);

  // Get the start of the week (Monday) for a given date
  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
  }

  // Format date as YYYY-MM-DD
  function formatDate(date) {
    return new Date(date).toISOString().split('T')[0];
  }

  // Format date for display
  function formatDisplayDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Navigate to previous week
  function previousWeek() {
    const prevWeek = new Date(currentWeekStarting);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeekStarting(prevWeek);
    
    // Clear plan ID from URL and fetch plan for the new week
    router.push(`/dashboard/children/${childId}/weekly-plan`);
  }

  // Navigate to next week
  function nextWeek() {
    const nextWeek = new Date(currentWeekStarting);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekStarting(nextWeek);
    
    // Clear plan ID from URL and fetch plan for the new week
    router.push(`/dashboard/children/${childId}/weekly-plan`);
  }

  // Handle adding an activity to the weekly plan
  async function handleAddActivity() {
    if (!selectedActivityId || !selectedDay || !selectedTimeSlot) {
      return;
    }

    try {
      const activityToAdd = activities.find(activity => activity.id === selectedActivityId);
      if (!activityToAdd) return;

      const newActivity = {
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

      // Save the updated weekly plan
      if (weeklyPlan.id) {
        // Update existing plan
        await updateWeeklyPlan(weeklyPlan.id, updatedWeeklyPlan);
      } else {
        // Create new plan
        const planId = await createWeeklyPlan(updatedWeeklyPlan);
        updatedWeeklyPlan.id = planId;
      }

      setWeeklyPlan(updatedWeeklyPlan);
      setShowAddActivity(false);
      setSelectedActivityId('');
      setSelectedDay('');
      
      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000); // Hide after 3 seconds
    } catch (error) {
      setError('Failed to add activity: ' + error.message);
    }
  }

  // Handle removing an activity from the weekly plan
  async function handleRemoveActivity(day, index) {
    try {
      // Clone the current weekly plan and remove the activity
      const updatedDayActivities = [...weeklyPlan[day]];
      updatedDayActivities.splice(index, 1);

      const updatedWeeklyPlan = {
        ...weeklyPlan,
        [day]: updatedDayActivities
      };

      // Save the updated weekly plan
      if (weeklyPlan.id) {
        await updateWeeklyPlan(weeklyPlan.id, updatedWeeklyPlan);
      } else {
        const planId = await createWeeklyPlan(updatedWeeklyPlan);
        updatedWeeklyPlan.id = planId;
      }

      setWeeklyPlan(updatedWeeklyPlan);

      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000); // Hide after 3 seconds
    } catch (error) {
      setError('Failed to remove activity: ' + error.message);
    }
  }
  
  // Handle updating activity status
  async function handleUpdateActivityStatus(day, index, newStatus) {
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

      // Save the updated weekly plan
      if (weeklyPlan.id) {
        await updateWeeklyPlan(weeklyPlan.id, updatedWeeklyPlan);
      } else {
        const planId = await createWeeklyPlan(updatedWeeklyPlan);
        updatedWeeklyPlan.id = planId;
      }

      setWeeklyPlan(updatedWeeklyPlan);

      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000); // Hide after 3 seconds
    } catch (error) {
      setError('Failed to update activity status: ' + error.message);
    }
  }
  
  // Handle generating a recommended plan
  async function handleGenerateRecommendedPlan() {
    if (!childId || !currentUser) {
      setError('User authentication or child information is missing');
      return;
    }
    
    try {
      setGeneratingPlan(true);
      setError('');
      
      // Generate a new plan
      const newPlan = await generateWeeklyPlan(childId, currentUser.uid);
      
      // Update state with the new plan
      setWeeklyPlan(newPlan);
      
      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating plan:', error);
      setError('Failed to generate recommended plan: ' + error.message);
    } finally {
      setGeneratingPlan(false);
    }
  }
  
  // Handle selecting an activity for observation
  function handleAddObservation(activityId, day, index) {
    setSelectedActivityForObservation({
      id: activityId,
      day,
      index
    });
    setShowAddObservation(true);
  }
  
  // Handle after observation is recorded
  function handleObservationRecorded() {
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
  function getAreaColorClass(area) {
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
  function getAreaLabel(area) {
    switch(area) {
      case 'practical_life': return 'Practical Life';
      case 'sensorial': return 'Sensorial';
      case 'language': return 'Language';
      case 'mathematics': return 'Mathematics';
      case 'cultural': return 'Cultural';
      default: return area;
    }
  }
  
  // Get status badge for an activity
  function StatusBadge({ status }) {
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
        <Link href={`/dashboard/children/${childId}`} className="mt-4 inline-block text-red-700 underline">
          Back to Child Profile
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/children/${childId}`} className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {child.name}'s Profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Weekly Plan</h1>
      </div>

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
            Generate a personalized weekly plan for {child.name} based on their developmental needs,
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
            {days.map((day, index) => (
              <div key={day} className="border rounded-lg overflow-hidden w-64">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="font-medium text-gray-700">{dayLabels[index]}</h4>
                </div>
                <div className="p-3 divide-y">
                  {timeSlots.map(timeSlot => (
                    <div key={timeSlot} className="py-2">
                      <div className="font-medium text-xs text-gray-500 mb-2">
                        {timeSlotLabels[timeSlot]}
                      </div>
                      {weeklyPlan[day]
                        ?.filter(activity => activity.timeSlot === timeSlot)
                        .map((activity, index) => {
                          const activityDetail = activityDetails[activity.activityId];
                          return (
                            <div key={`${activity.activityId}-${index}`} className="mb-2 border rounded-md p-3 bg-gray-50">
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="text-sm font-medium">
                                  {activityDetail?.title || 'Unknown Activity'}
                                </h5>
                                <div className="flex space-x-2">
                                  {activity.status !== 'completed' && (
                                    <button
                                      onClick={() => handleAddObservation(activity.activityId, day, index)}
                                      className="text-xs text-emerald-600 hover:text-emerald-800"
                                      title="Add Observation"
                                    >
                                      <File className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleRemoveActivity(day, index)}
                                    className="text-gray-400 hover:text-red-500"
                                    title="Remove Activity"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              
                              {activityDetail && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getAreaColorClass(activityDetail.area)}`}>
                                    {getAreaLabel(activityDetail.area)}
                                  </span>
                                  {activityDetail.duration && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {activityDetail.duration} min
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex justify-between items-center mt-2">
                                <StatusBadge status={activity.status} />
                                
                                {activity.status !== 'completed' && (
                                  <button
                                    onClick={() => handleUpdateActivityStatus(day, index, 'completed')}
                                    className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100"
                                  >
                                    Mark Complete
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                  {days.map((day, index) => (
                    <option key={day} value={day}>
                      {dayLabels[index]}
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
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                >
                  {Object.entries(timeSlotLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-md">
                {filteredActivities.map(activity => (
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getAreaColorClass(activity.area)}`}>
                          {getAreaLabel(activity.area)}
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Record Observation
              </h3>
              <button
                onClick={() => setShowAddObservation(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Insert ActivityObservationForm component here */}
              {/* This would be imported from components/ActivityObservationForm */}
              {selectedActivityForObservation && (
                <div>
                  <p className="mb-4 text-gray-600">
                    Record your observations for the activity "{activityDetails[selectedActivityForObservation.id]?.title || 'Activity'}" 
                    completed on {dayLabels[days.indexOf(selectedActivityForObservation.day)]}.
                  </p>
                  
                  {/* This would normally be replaced with the actual component */}
                  <div className="bg-yellow-50 p-4 rounded-md">
                    <p className="text-yellow-700">
                      ActivityObservationForm would be rendered here, with props:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-yellow-600">
                      <li>activityId: {selectedActivityForObservation.id}</li>
                      <li>childId: {childId}</li>
                      <li>onSuccess: handleObservationRecorded</li>
                    </ul>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setShowAddObservation(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}