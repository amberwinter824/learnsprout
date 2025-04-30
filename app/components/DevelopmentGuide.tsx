import { useState } from 'react';
import { ArrowLeft, CheckCircle, Info, Plus, X } from 'lucide-react';
import { ActivityObservationForm } from './ActivityObservationForm';

interface Activity {
  id: string;
  title: string;
  description: string;
  materials: string[];
  tips: string[];
  difficulty: 'easy' | 'medium' | 'challenging';
  estimatedTime: string;
}

interface DomainGuide {
  domain: string;
  description: string;
  focusAreas: string[];
  activities: Activity[];
  color: {
    bg: string;
    text: string;
    border: string;
  };
}

interface DevelopmentGuideProps {
  childName: string;
  childId: string;
  assessmentResults: {
    skillId: string;
    status: 'emerging' | 'developing' | 'mastered';
  }[];
  onBack: () => void;
}

interface ActivityObservation {
  id: string;
  activityId: string;
  date: Date;
  notes: string;
  photos: string[];
  videos: string[];
  childReaction: string;
  parentReflection: string;
  nextSteps: string;
}

interface ActivityDetailsPopupProps {
  activity: Activity;
  onClose: () => void;
  children: React.ReactNode;
}

function ActivityDetailsPopup({ activity, onClose, children }: ActivityDetailsPopupProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{activity.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface MaterialsForecastProps {
  activity: Activity;
  onClose: () => void;
}

function MaterialsForecast({ activity, onClose }: MaterialsForecastProps) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Materials Needed</h3>
      <ul className="space-y-2">
        {activity.materials.map((material, index) => (
          <li key={index} className="flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></span>
            <span className="text-gray-700">{material}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function DevelopmentGuide({ 
  childName, 
  childId,
  assessmentResults,
  onBack 
}: DevelopmentGuideProps) {
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());
  const [showTips, setShowTips] = useState<Set<string>>(new Set());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [showMaterialsForecast, setShowMaterialsForecast] = useState(false);
  const [observations, setObservations] = useState<ActivityObservation[]>([]);

  // This would be populated from your database based on assessment results
  const domainGuides: DomainGuide[] = [
    {
      domain: 'Practical Life',
      description: 'Daily living skills and independence',
      focusAreas: ['Self-care', 'Fine motor coordination', 'Organization'],
      color: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
      activities: [
        {
          id: 'pl-1',
          title: 'Dressing Practice',
          description: 'Practice putting on and taking off clothes independently',
          materials: ['Clothing items with different fasteners', 'Mirror'],
          tips: [
            'Start with large buttons and zippers',
            'Use a mirror to help with orientation',
            'Break down steps into smaller parts'
          ],
          difficulty: 'medium',
          estimatedTime: '15-20 minutes'
        },
        {
          id: 'pl-2',
          title: 'Table Setting',
          description: 'Learn to set the table with proper placement of utensils',
          materials: ['Child-sized utensils', 'Plates', 'Cups', 'Placemats'],
          tips: [
            'Use placemats with outlines',
            'Start with basic items and add more as skills develop',
            'Make it a daily routine'
          ],
          difficulty: 'easy',
          estimatedTime: '10-15 minutes'
        }
      ]
    },
    // Add more domains with their activities
  ];

  const toggleActivityComplete = (activityId: string) => {
    setCompletedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const toggleTips = (activityId: string) => {
    setShowTips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const handleAddObservation = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowObservationForm(true);
  };

  const handleSaveObservation = (observation: Omit<ActivityObservation, 'id'>) => {
    const newObservation = {
      ...observation,
      id: Date.now().toString(),
      activityId: selectedActivity!.id
    };
    setObservations(prev => [...prev, newObservation]);
    setShowObservationForm(false);
    setSelectedActivity(null);
  };

  const handleViewMaterials = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowMaterialsForecast(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {childName}'s Development Guide
          </h1>
          <p className="mt-2 text-gray-600">
            Based on your assessment, here are personalized activities to support {childName}'s growth and development.
            Choose activities that work best for your schedule and interests.
          </p>
        </div>

        {domainGuides.map(guide => (
          <div key={guide.domain} className={`mb-8 p-6 rounded-lg ${guide.color.bg} ${guide.color.border} border`}>
            <h2 className={`text-xl font-semibold mb-2 ${guide.color.text}`}>
              {guide.domain}
            </h2>
            <p className="text-gray-700 mb-4">{guide.description}</p>
            
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">Focus Areas:</h3>
              <div className="flex flex-wrap gap-2">
                {guide.focusAreas.map(area => (
                  <span key={area} className="px-3 py-1 bg-white rounded-full text-sm text-gray-700">
                    {area}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {guide.activities.map(activity => (
                <div key={activity.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{activity.title}</h3>
                      <p className="text-gray-600 mt-1">{activity.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewMaterials(activity)}
                        className="p-2 text-emerald-600 hover:text-emerald-700"
                      >
                        <Info className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => toggleActivityComplete(activity.id)}
                        className={`p-2 rounded-full ${
                          completedActivities.has(activity.id)
                            ? 'text-green-500 bg-green-50'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Materials Needed:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {activity.materials.map((material, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                            {material}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Details:</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Difficulty: {activity.difficulty}</p>
                        <p>Time: {activity.estimatedTime}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={() => toggleTips(activity.id)}
                      className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      <Info className="h-4 w-4 mr-1" />
                      {showTips.has(activity.id) ? 'Hide Tips' : 'Show Tips'}
                    </button>
                    <button
                      onClick={() => handleAddObservation(activity)}
                      className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Observation
                    </button>
                  </div>

                  {showTips.has(activity.id) && (
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      {activity.tips.map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2 mt-1"></span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {showObservationForm && selectedActivity && (
          <ActivityDetailsPopup
            activity={selectedActivity}
            onClose={() => {
              setShowObservationForm(false);
              setSelectedActivity(null);
            }}
          >
            <ActivityObservationForm
              activityId={selectedActivity.id}
              childId={childId}
              onSuccess={() => {
                setShowObservationForm(false);
                setSelectedActivity(null);
              }}
              onClose={() => {
                setShowObservationForm(false);
                setSelectedActivity(null);
              }}
            />
          </ActivityDetailsPopup>
        )}

        {showMaterialsForecast && selectedActivity && (
          <ActivityDetailsPopup
            activity={selectedActivity}
            onClose={() => {
              setShowMaterialsForecast(false);
              setSelectedActivity(null);
            }}
          >
            <MaterialsForecast
              activity={selectedActivity}
              onClose={() => {
                setShowMaterialsForecast(false);
                setSelectedActivity(null);
              }}
            />
          </ActivityDetailsPopup>
        )}
      </div>
    </div>
  );
} 