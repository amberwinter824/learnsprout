// app/dashboard/children/[id]/weekly-plan/page.js
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
  updateWeeklyPlan 
} from '@/lib/dataService';
import { ArrowLeft, Plus, X, Info, Calendar, ArrowRight, ArrowLeft as ArrowLeftIcon } from 'lucide-react';

export default function WeeklyPlanPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = params;
  const activityIdFromUrl = searchParams.get('activityId');
  
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

  // Initialize days and time slots
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = ['morning', 'afternoon'];
  const timeSlotLabels = { morning: 'Morning', afternoon: 'Afternoon' };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch child data
        const childData = await getChild(id);
        if (!childData) {
          setError('Child not found');
          setLoading(false);
          return;
        }
        setChild(childData);

        // Fetch weekly plan for the current week
        const weeklyPlanData = await getCurrentWeeklyPlan(
          id,
          currentWeekStarting
        );

        if (weeklyPlanData) {
          setWeeklyPlan(weeklyPlanData);
        } else {
          // Initialize an empty weekly plan
          const emptyPlan = {
            childId: id,
            weekStarting: currentWeekStarting,
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: []
          };
          setWeeklyPlan(emptyPlan);
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
  }, [id, currentWeekStarting, activityIdFromUrl]);

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
  }

  // Navigate to next week
  function nextWeek() {
    const nextWeek = new Date(currentWeekStarting);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekStarting(nextWeek);
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
        title: activityToAdd.title,
        area: activityToAdd.area,
        duration: activityToAdd.duration,
        timeSlot: selectedTimeSlot,
        status: 'scheduled',
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>{error}</p>
        <Link href={`/dashboard/children/${id}`} className="mt-4 inline-block text-red-700 underline">
          Back to Child Profile
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/children/${id}`} className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {child.name}'s Profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Weekly Plan</h1>
      </div>

      {/* Success message */}
      {showSaveSuccess && (
        <div className="mb-4 bg-green-50 text-green-700 p-4 rounded-md">
          Weekly plan updated successfully!
        </div>
      )}

      {/* Week navigation */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <button 
            onClick={previousWeek}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </button>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Week of {formatDisplayDate(currentWeekStarting)}
            </h3>
          </div>
          <button 
            onClick={nextWeek}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ArrowRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Weekly plan grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Activities</h3>
          <button
            onClick={() => setShowAddActivity(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Plus className="-ml-1 mr-1 h-4 w-4" />
            Add Activity
          </button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-5 gap-4">
            {days.map((day, index) => (
              <div key={day} className="border rounded-lg overflow-hidden">
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
                        .filter(activity => activity.timeSlot === timeSlot)
                        .map((activity, index) => (
                          <div key={`${activity.activityId}-${index}`} className="mb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium">{activity.title}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getAreaColorClass(activity.area)}`}>
                                  {getAreaLabel(activity.area)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemoveActivity(day, index)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
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
    </div>
  );
}