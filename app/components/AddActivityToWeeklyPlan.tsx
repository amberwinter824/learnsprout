// AddActivityToWeeklyPlan.tsx - Component to add activities to an existing weekly plan
import { useState, useEffect } from 'react';
import { 
  Loader2, 
  Search, 
  Calendar, 
  Clock, 
  X,
  Plus,
  Filter,
  Check
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Activity {
  id: string;
  title: string;
  description?: string;
  area?: string;
  duration?: number;
  difficulty?: string;
  ageRanges?: string[];
  [key: string]: any;
}

interface AddActivityToWeeklyPlanProps {
  weeklyPlanId: string;
  childId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function AddActivityToWeeklyPlan({
  weeklyPlanId,
  childId,
  onSuccess,
  onClose
}: AddActivityToWeeklyPlanProps) {
  // State for activities
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [areas, setAreas] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // State for selected activity
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('morning');
  
  // State for form submission
  const [saving, setSaving] = useState(false);
  
  const dayOptions = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
  ];
  
  const timeSlotOptions = [
    { id: 'morning', label: 'Morning' },
    { id: 'afternoon', label: 'Afternoon' },
    { id: 'evening', label: 'Evening' },
  ];
  
  // Fetch activities on component mount
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get child data to check age group
        const childDoc = await getDoc(doc(db, 'children', childId));
        if (!childDoc.exists()) {
          throw new Error('Child not found');
        }
        
        const childData = childDoc.data();
        const ageGroup = childData.ageGroup;
        
        // Get age-appropriate activities
        const activitiesQuery = query(
          collection(db, 'activities'),
          where('ageRanges', 'array-contains', ageGroup)
        );
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        
        if (activitiesSnapshot.empty) {
          setActivities([]);
          setFilteredActivities([]);
          setLoading(false);
          return;
        }
        
        // Process activities
        const activityData: Activity[] = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activity[];
        
        setActivities(activityData);
        setFilteredActivities(activityData);
        
        // Extract unique areas for filtering
        const uniqueAreas = Array.from(
          new Set(activityData.map(activity => activity.area).filter(Boolean))
        );
        setAreas(uniqueAreas as string[]);
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching activities:', err);
        setError(`Failed to load activities: ${err.message}`);
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [childId]);
  
  // Filter activities when search or filter changes
  useEffect(() => {
    if (activities.length === 0) return;
    
    const filtered = activities.filter(activity => {
      // Check search term
      const matchesSearch = 
        !searchTerm || 
        activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Check area filter
      const matchesArea = !selectedArea || activity.area === selectedArea;
      
      return matchesSearch && matchesArea;
    });
    
    setFilteredActivities(filtered);
  }, [searchTerm, selectedArea, activities]);
  
  // Format area name for display
  const formatAreaName = (area?: string) => {
    if (!area) return '';
    
    return area
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get color class for area display
  const getAreaColor = (area?: string) => {
    if (!area) return 'bg-gray-100 text-gray-700';
    
    const areaColors: {[key: string]: string} = {
      'practical_life': 'bg-blue-100 text-blue-700',
      'sensorial': 'bg-purple-100 text-purple-700',
      'language': 'bg-green-100 text-green-700',
      'mathematics': 'bg-red-100 text-red-700',
      'cultural': 'bg-amber-100 text-amber-700',
      'science': 'bg-teal-100 text-teal-700',
      'art': 'bg-indigo-100 text-indigo-700'
    };
    
    return areaColors[area] || 'bg-gray-100 text-gray-700';
  };
  
  // Add activity to weekly plan
  const handleAddActivity = async () => {
    if (!selectedActivityId || !selectedDay || !selectedTimeSlot || !weeklyPlanId) {
      setError('Please select an activity, day, and time slot');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Get the weekly plan document
      const planRef = doc(db, 'weeklyPlans', weeklyPlanId);
      const planDoc = await getDoc(planRef);
      
      if (!planDoc.exists()) {
        throw new Error('Weekly plan not found');
      }
      
      const planData = planDoc.data();
      
      // Get current activities for the selected day
      const dayActivities = [...(planData[selectedDay] || [])];
      
      // Create new activity entry
      const newActivity = {
        activityId: selectedActivityId,
        timeSlot: selectedTimeSlot,
        status: 'suggested',
        order: dayActivities.length // Add to the end
      };
      
      // Add to the day's activities
      dayActivities.push(newActivity);
      
      // Update the weekly plan
      await updateDoc(planRef, {
        [selectedDay]: dayActivities,
        updatedAt: serverTimestamp()
      });
      
      // Call success callback
      onSuccess();
    } catch (err: any) {
      console.error('Error adding activity:', err);
      setError(`Failed to add activity: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedArea('');
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Add Activity to Weekly Plan</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Search and filters */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activities..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </button>
          </div>
          
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Area
                </label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm"
                >
                  <option value="">All Areas</option>
                  {areas.map(area => (
                    <option key={area} value={area}>
                      {formatAreaName(area)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Activity list */}
        <div className="flex-grow overflow-y-auto">
          {error && (
            <div className="px-6 py-3 text-red-700 bg-red-50">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-emerald-500" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No activities found</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 text-sm text-emerald-600 hover:text-emerald-700"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="px-6 py-3 divide-y divide-gray-200">
              {filteredActivities.map(activity => (
                <div 
                  key={activity.id}
                  className={`py-3 cursor-pointer ${
                    selectedActivityId === activity.id ? 'bg-emerald-50' : ''
                  }`}
                  onClick={() => setSelectedActivityId(activity.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{activity.title}</h4>
                      {activity.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{activity.description}</p>
                      )}
                    </div>
                    
                    {selectedActivityId === activity.id && (
                      <div className="ml-2 bg-emerald-100 p-0.5 rounded-full text-emerald-600">
                        <Check className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activity.area && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getAreaColor(activity.area)}`}>
                        {formatAreaName(activity.area)}
                      </span>
                    )}
                    
                    {activity.duration && (
                      <span className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {activity.duration} min
                      </span>
                    )}
                    
                    {activity.difficulty && (
                      <span className="text-xs text-gray-500 capitalize">
                        {activity.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Schedule details */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <h4 className="font-medium text-gray-700 mb-3">Schedule Details</h4>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label htmlFor="selectedDay" className="block text-sm font-medium text-gray-700 mb-1">
                Day
              </label>
              <select
                id="selectedDay"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm"
              >
                {dayOptions.map(day => (
                  <option key={day.id} value={day.id}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="selectedTimeSlot" className="block text-sm font-medium text-gray-700 mb-1">
                Time Slot
              </label>
              <select
                id="selectedTimeSlot"
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm"
              >
                {timeSlotOptions.map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleAddActivity}
              disabled={saving || !selectedActivityId}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}