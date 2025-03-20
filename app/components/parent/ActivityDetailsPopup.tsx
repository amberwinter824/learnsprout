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
  Layers
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActivityDetailsPopupProps {
  activityId: string;
  onClose: () => void;
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
  [key: string]: any;
}

export default function ActivityDetailsPopup({ 
  activityId, 
  onClose 
}: ActivityDetailsPopupProps) {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'setup' | 'instructions'>('setup');
  const [activitySkills, setActivitySkills] = useState<Skill[]>([]);

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
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
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

          {tab === 'setup' && (
            <div>
              {/* Activity info and tags */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {activity.area && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAreaColor(activity.area)}`}>
                      {activity.area.replace('_', ' ')}
                    </span>
                  )}
                  
                  {activity.duration && (
                    <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      <Clock className="h-3 w-3 mr-1" />
                      {activity.duration} min
                    </span>
                  )}
                  
                  {activity.difficulty && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                      {activity.difficulty}
                    </span>
                  )}
                  
                  {activity.environmentType === 'bridge' && (
                    <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      <Star className="h-3 w-3 mr-1" />
                      School Connection
                    </span>
                  )}
                </div>
                
                {activity.description && (
                  <p className="text-gray-600 mb-4">{activity.description}</p>
                )}
              </div>
              
              {/* Materials needed */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Materials Needed</h3>
                {materials.length > 0 ? (
                  <ul className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    {materials.map((material: string, index: number) => (
                      <li key={index} className="flex items-start mb-2 last:mb-0">
                        <span className="inline-block w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">
                          •
                        </span>
                        <span>{material}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No specific materials listed.</p>
                )}
              </div>
              
              {/* Preparation */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preparation</h3>
                <p className="text-gray-600 mb-2">
                  Before starting this activity, make sure you have all materials ready and create a calm environment.
                </p>
                
                <button
                  onClick={() => setTab('instructions')}
                  className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-md flex items-center justify-center"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Instructions
                </button>
              </div>
            </div>
          )}
          
          {tab === 'instructions' && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">How to Complete This Activity</h3>
              
              {instructionsList.length > 0 ? (
                <ol className="space-y-4 mb-6">
                  {instructionsList.map((instruction, index) => (
                    <li key={index} className="flex">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 font-medium text-sm mr-3 shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{instruction}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-500 italic mb-4">No specific instructions provided.</p>
              )}
              
              {/* Tips */}
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-6">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Tips</h4>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li>• Observe your child's level of interest and engagement</li>
                  <li>• Let your child lead the activity at their own pace</li>
                  <li>• It's okay if the activity doesn't go exactly as planned</li>
                  <li>• Focus on the process, not the end result</li>
                </ul>
              </div>
              
              {/* Mark complete button */}
              <button
                onClick={onClose}
                className="w-full py-2 bg-emerald-600 text-white rounded-md flex items-center justify-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Ready to Start
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}