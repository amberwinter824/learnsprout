import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  Camera, 
  Star, 
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';

// Define types for our component
interface Activity {
  id: string;
  title: string;
  description: string;
  duration: number;
  area: string;
  completed: boolean;
  isHomeSchoolConnection: boolean;
}

interface SimplifiedActivityDashboardProps {
  childId: string;
  childName: string;
}

const SimplifiedActivityDashboard: React.FC<SimplifiedActivityDashboardProps> = ({ 
  childId, 
  childName 
}) => {
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showQuickObserve, setShowQuickObserve] = useState<boolean>(false);

  useEffect(() => {
    // Simulate fetching today's activities
    setTimeout(() => {
      setTodayActivities([
        {
          id: 'act1',
          title: 'Pouring Exercise',
          description: 'Practice pouring water between containers',
          duration: 15,
          area: 'practical_life',
          completed: false,
          isHomeSchoolConnection: true
        },
        {
          id: 'act2',
          title: 'Letter Sound Matching',
          description: 'Match objects with their beginning sounds',
          duration: 20,
          area: 'language',
          completed: false,
          isHomeSchoolConnection: false
        },
        {
          id: 'act3',
          title: 'Counting Objects Game',
          description: 'Count objects and match with numbers',
          duration: 15,
          area: 'mathematics',
          completed: true,
          isHomeSchoolConnection: true
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [childId]);

  const handleActivitySelect = (activity: Activity): void => {
    setSelectedActivity(activity);
  };

  const markComplete = (activityId: string): void => {
    setTodayActivities(prev => 
      prev.map(act => 
        act.id === activityId ? {...act, completed: true} : act
      )
    );
    setShowQuickObserve(true);
  };

  const getAreaColor = (area: string): string => {
    const areaColors: Record<string, string> = {
      'practical_life': 'bg-pink-100 text-pink-800',
      'sensorial': 'bg-purple-100 text-purple-800',
      'language': 'bg-blue-100 text-blue-800',
      'mathematics': 'bg-green-100 text-green-800',
      'cultural': 'bg-yellow-100 text-yellow-800'
    };
    return areaColors[area] || 'bg-gray-100 text-gray-800';
  };

  // Simple Quick Observation component
  interface QuickObserveFormProps {
    activity: Activity;
    onClose: () => void;
  }
  
  type EngagementLevel = 'low' | 'medium' | 'high';

  const QuickObserveForm: React.FC<QuickObserveFormProps> = ({ activity, onClose }) => {
    const [note, setNote] = useState<string>('');
    const [engagement, setEngagement] = useState<EngagementLevel>('medium');
    
    const handleSubmit = (): void => {
      // Submit the observation
      console.log("Observation recorded:", { 
        activityId: activity.id, 
        note, 
        engagement,
        completionStatus: 'completed'
      });
      
      // Close the form
      onClose();
    };
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <h3 className="font-medium mb-3">Quick Observation</h3>
        
        <div className="mb-3">
          <label className="block text-sm mb-1">How did it go?</label>
          <div className="flex space-x-2">
            {(['low', 'medium', 'high'] as EngagementLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setEngagement(level)}
                className={`px-3 py-1 rounded text-sm ${
                  engagement === level 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {level === 'high' && '😃 '}
                {level === 'medium' && '🙂 '}
                {level === 'low' && '😐 '}
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-3">
          <label className="block text-sm mb-1">Quick note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="What did you notice?"
            rows={2}
          />
        </div>
        
        <div className="flex justify-between">
          <button 
            onClick={onClose}
            className="px-3 py-1 bg-gray-100 rounded"
          >
            Skip
          </button>
          <button 
            onClick={handleSubmit}
            className="px-3 py-1 bg-emerald-600 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
          <h2 className="text-lg font-medium">Today's Activities for {childName}</h2>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>
      
      <div className="p-4">
        {showQuickObserve && selectedActivity && (
          <div className="mb-4">
            <QuickObserveForm 
              activity={selectedActivity} 
              onClose={() => {
                setShowQuickObserve(false);
                setSelectedActivity(null);
              }} 
            />
          </div>
        )}
      
        <div className="space-y-3">
          {todayActivities.map(activity => (
            <div 
              key={activity.id}
              className={`border rounded-lg overflow-hidden ${
                activity.completed ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div 
                className="p-3 cursor-pointer"
                onClick={() => handleActivitySelect(activity)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{activity.title}</h3>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                  </div>
                  {activity.completed ? (
                    <span className="flex items-center text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Done
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivitySelect(activity);
                        markComplete(activity.id);
                      }}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1 rounded text-sm"
                    >
                      Mark Done
                    </button>
                  )}
                </div>
                
                <div className="flex items-center text-xs text-gray-500 space-x-3">
                  <span className={`px-2 py-0.5 rounded-full ${getAreaColor(activity.area)}`}>
                    {activity.area.replace('_', ' ')}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {activity.duration} min
                  </span>
                  {activity.isHomeSchoolConnection && (
                    <span className="flex items-center text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <Star className="h-3 w-3 mr-1" />
                      School Connection
                    </span>
                  )}
                </div>
              </div>
              
              {activity.completed && (
                <div className="flex border-t border-green-200 text-sm">
                  <button className="flex items-center justify-center py-2 flex-1 text-green-700 hover:bg-green-100">
                    <Camera className="h-4 w-4 mr-1" />
                    Add Photo
                  </button>
                  <button className="flex items-center justify-center py-2 flex-1 text-green-700 hover:bg-green-100 border-l border-green-200">
                    <FileText className="h-4 w-4 mr-1" />
                    Add Notes
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6">
          <button className="flex items-center justify-center w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
            See Activity History
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedActivityDashboard;