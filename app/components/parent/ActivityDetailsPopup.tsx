// app/components/parent/ActivityDetailsPopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle, 
  Star, 
  ArrowRight, 
  BookOpen,
  ClipboardList,
  Layers,
  Eye
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QuickObservationForm from './QuickObservationForm';

interface ActivityDetailsPopupProps {
  activityId: string;
  onClose: () => void;
  childId: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  area: string;
}

interface ActivityData {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  area?: string;
  materialsNeeded?: string[];
  duration?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  ageRanges?: string[];
  skillsAddressed?: string[];
  setupSteps?: string[];  // Step-by-step setup instructions
  demonstrationSteps?: string[];  // How to demonstrate the activity to the child
  observationPoints?: string[];  // What to look for during the activity
  successIndicators?: string[];  // Signs that the child has mastered the activity
  commonChallenges?: string[];  // Common issues and how to address them
  extensions?: string[];  // Ways to extend or vary the activity
  [key: string]: any;
}

export default function ActivityDetailsPopup({ 
  activityId, 
  onClose,
  childId
}: ActivityDetailsPopupProps) {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'setup' | 'instructions' | 'observation' | 'extensions'>('setup');
  const [activitySkills, setActivitySkills] = useState<Skill[]>([]);
  const [showObservationForm, setShowObservationForm] = useState(false);

  useEffect(() => {
    const fetchActivityDetails = async () => {
      try {
        setLoading(true);
        const activityDoc = await getDoc(doc(db, 'activities', activityId));
        
        if (!activityDoc.exists()) {
          setError('Activity not found');
          setLoading(false);
          return;
        }
        
        const activityData = {
          id: activityDoc.id,
          ...activityDoc.data()
        } as ActivityData;
        setActivity(activityData);

        // Fetch related skills if they exist
        if (activityData.skillsAddressed?.length) {
          const skillPromises = activityData.skillsAddressed.map(
            (skillId: string) => getDoc(doc(db, 'developmentalSkills', skillId))
          );

          const skillDocs = await Promise.all(skillPromises);
          const skills = skillDocs
            .filter((doc) => doc.exists())
            .map((doc) => ({
              id: doc.id,
              ...doc.data()
            } as Skill));

          setActivitySkills(skills);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching activity details:', err);
        setError('Failed to load activity details');
        setLoading(false);
      }
    };
    
    if (activityId) {
      fetchActivityDetails();
    }
  }, [activityId]);

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

  const formatInstructions = (text?: string) => {
    if (!text) return [];
    
    // Split by line breaks or numbered patterns (1., 2., etc.)
    const lines = text.split(/\n|(?=\d+\.)/);
    
    // Filter out empty lines and trim each line
    return lines
      .filter(line => line.trim().length > 0)
      .map(line => line.trim());
  };

  // If loading, show a spinner
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Error</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // If no activity, show a message
  if (!activity) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Activity Not Found</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p>The requested activity could not be found.</p>
        </div>
      </div>
    );
  }

  // Format the instructions
  const instructionsList = formatInstructions(activity.instructions);
  
  // Get materials needed
  const materials = activity.materialsNeeded || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">{activity.title}</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex mt-4 border-b border-gray-200">
            <button
              onClick={() => setTab('setup')}
              className={`px-4 py-2 text-sm font-medium ${
                tab === 'setup' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <Layers className="h-4 w-4 mr-2" />
                Setup
              </div>
            </button>
            <button
              onClick={() => setTab('instructions')}
              className={`px-4 py-2 text-sm font-medium ${
                tab === 'instructions' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <ClipboardList className="h-4 w-4 mr-2" />
                Instructions
              </div>
            </button>
            <button
              onClick={() => setTab('observation')}
              className={`px-4 py-2 text-sm font-medium ${
                tab === 'observation' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Observation
              </div>
            </button>
            <button
              onClick={() => setTab('extensions')}
              className={`px-4 py-2 text-sm font-medium ${
                tab === 'extensions' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2" />
                Extensions
              </div>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {tab === 'setup' && (
            <div className="space-y-4">
              {/* Materials Needed */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Materials Needed</h3>
                <ul className="space-y-2">
                  {materials.map((material, index) => (
                    <li key={index} className="flex items-start">
                      <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                      <span className="text-gray-700">{material}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Setup Steps */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Setup Steps</h3>
                <div className="bg-white rounded-lg border border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    {activity.setupSteps?.map((step, index) => (
                      <li key={index} className="p-4 flex items-start">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Activity Skills Overview */}
              {activitySkills.length > 0 && (
                <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Developmental Focus</h4>
                  <div className="space-y-3">
                    {activitySkills.map(skill => (
                      <div key={skill.id} className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">{skill.name}</p>
                          <p className="text-sm text-blue-700">{skill.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setTab('instructions')}
                className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-md flex items-center justify-center"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                View Instructions
              </button>
            </div>
          )}
          
          {tab === 'instructions' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-emerald-800 mb-2">How to Present This Activity</h3>
                <p className="text-sm text-emerald-700">
                  Follow these steps to introduce the activity to your child for the first time:
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {activity.demonstrationSteps?.map((step, index) => (
                    <li key={index} className="p-4 flex items-start">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {tab === 'observation' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-emerald-800 mb-2">What to Watch For</h3>
                <p className="text-sm text-emerald-700">
                  Observe these key points as your child works with the activity:
                </p>
              </div>
              
              <ul className="space-y-3">
                {activity.observationPoints?.map((point, index) => (
                  <li key={index} className="flex items-start bg-white p-4 rounded-lg border border-gray-200">
                    <Eye className="h-5 w-5 text-emerald-500 mr-3 mt-0.5" />
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end">
                <button
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onClick={() => setShowObservationForm(true)}
                >
                  Add Observation
                </button>
              </div>
              {showObservationForm && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl p-4 max-w-lg w-full relative">
                    <QuickObservationForm
                      activityId={activityId}
                      childId={childId}
                      onClose={() => setShowObservationForm(false)}
                      onSuccess={() => setShowObservationForm(false)}
                    />
                    <button
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowObservationForm(false)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'extensions' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-emerald-800 mb-2">Next Steps</h3>
                <p className="text-sm text-emerald-700">
                  When your child shows mastery, try these variations to extend the learning:
                </p>
              </div>
              
              <ul className="space-y-3">
                {activity.extensions?.map((extension, index) => (
                  <li key={index} className="flex items-start bg-white p-4 rounded-lg border border-gray-200">
                    <ArrowRight className="h-5 w-5 text-emerald-500 mr-3 mt-0.5" />
                    <span className="text-gray-700">{extension}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}