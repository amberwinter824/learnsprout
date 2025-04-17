import { useState, useEffect } from 'react';
import { Calendar, Plus, Minus, Loader2, ChevronRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SchedulePreferencesSidebarProps {
  onPreferencesUpdated?: () => void;
}

export default function SchedulePreferencesSidebar({ onPreferencesUpdated }: SchedulePreferencesSidebarProps) {
  const { currentUser } = useAuth();
  const [scheduleByDay, setScheduleByDay] = useState<{[key: string]: number}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const weekdays = [
    { id: 'monday', label: 'Mon' },
    { id: 'tuesday', label: 'Tue' },
    { id: 'wednesday', label: 'Wed' },
    { id: 'thursday', label: 'Thu' },
    { id: 'friday', label: 'Fri' },
    { id: 'saturday', label: 'Sat' },
    { id: 'sunday', label: 'Sun' }
  ];

  useEffect(() => {
    if (currentUser?.preferences?.activityPreferences?.scheduleByDay) {
      setScheduleByDay(currentUser.preferences.activityPreferences.scheduleByDay);
    } else {
      // Default values if no preferences exist
      const defaultSchedule: {[key: string]: number} = {};
      weekdays.forEach(day => {
        defaultSchedule[day.id] = ['monday', 'wednesday', 'friday'].includes(day.id) ? 2 : 0;
      });
      setScheduleByDay(defaultSchedule);
    }
  }, [currentUser]);

  const adjustDayActivities = (dayId: string, change: number) => {
    setScheduleByDay(prev => {
      const current = prev[dayId] || 0;
      const newValue = Math.max(0, current + change);
      return { ...prev, [dayId]: newValue };
    });
  };

  const handleSave = async () => {
    if (!currentUser) return;
    
    try {
      setIsSaving(true);
      
      // Update preferences using the auth context
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'preferences.activityPreferences.scheduleByDay': scheduleByDay,
        updatedAt: new Date()
      });

      // Call the callback if provided
      if (onPreferencesUpdated) {
        onPreferencesUpdated();
      }
    } catch (error) {
      console.error('Error saving schedule preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasSchedulePreferences = Object.values(scheduleByDay).some(count => count > 0);
  
  // Calculate summary information
  const totalDaysWithActivities = Object.values(scheduleByDay).filter(count => count > 0).length;
  const maxActivitiesPerDay = Math.max(...Object.values(scheduleByDay));

  return (
    <div className="bg-white shadow rounded-lg p-4">
      {/* Header with collapse toggle */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-medium text-gray-900">Weekly Schedule</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasSchedulePreferences && (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          )}
          {!hasSchedulePreferences && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              Using Default
            </span>
          )}
          <ChevronRight 
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
          />
        </div>
      </div>

      {/* Collapsed summary view */}
      {!isExpanded && (
        <div className="mt-2">
          {hasSchedulePreferences ? (
            <div className="text-sm text-gray-600">
              <p>{totalDaysWithActivities} days/week with activities</p>
              <p>Up to {maxActivitiesPerDay} activities per day</p>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 mt-2">
              <p className="text-sm text-emerald-800">
                Using default schedule: 2 activities on Monday, Wednesday, and Friday. Click to customize.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Expanded preferences form */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-2">
              Choose how many activities you'd like to do each day. This helps us create a personalized weekly plan that matches your family's routine.
            </p>
            <p className="text-xs text-gray-500">
              Use the + and - buttons to adjust the number of activities for each day. Setting a day to 0 means it will be a rest day.
            </p>
          </div>

          <div className="space-y-3">
            {weekdays.map(day => (
              <div key={day.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 w-24">{day.label}</span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => adjustDayActivities(day.id, -1)}
                    className="p-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-medium text-gray-700 w-6 text-center">
                    {scheduleByDay[day.id] || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustDayActivities(day.id, 1)}
                    className="p-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Schedule'
            )}
          </button>
        </div>
      )}
    </div>
  );
} 