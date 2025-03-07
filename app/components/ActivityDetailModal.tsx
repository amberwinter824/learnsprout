// app/components/ActivityDetailModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ArrowRight, BookOpen, ClipboardCheck, Lightbulb } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ActivityObservationForm } from './ActivityObservationForm';

interface ActivityDetailModalProps {
  activityId: string;
  childId: string;
  isOpen: boolean;
  onClose: () => void;
  onObservationRecorded?: () => void;
  weeklyPlanId?: string;  // Added weeklyPlanId prop
  dayOfWeek?: string;     // Added dayOfWeek prop
}

interface ActivityData {
  id?: string;
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

export default function ActivityDetailModal({
  activityId,
  childId,
  isOpen,
  onClose,
  onObservationRecorded,
  weeklyPlanId,
  dayOfWeek
}: ActivityDetailModalProps) {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'observation'>('details');
  const [mounted, setMounted] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!activityId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const activityRef = doc(db, 'activities', activityId);
        const activityDoc = await getDoc(activityRef);
        
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
      } catch (err) {
        console.error('Error fetching activity:', err);
        setError('Failed to load activity details');
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen && activityId) {
      fetchActivity();
    }
  }, [activityId, isOpen]);

  const handleTabChange = (tab: 'details' | 'observation') => {
    setActiveTab(tab);
  };

  const handleObservationSuccess = () => {
    // Show success message
    setSuccessMessage('Observation recorded successfully!');
    
    // Call the parent callback if provided
    if (onObservationRecorded) {
      onObservationRecorded();
    }
    
    // Close the modal after a short delay to show success message
    setTimeout(() => {
      onClose();
    }, 1500);
  };

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

  const getDifficultyColor = (difficulty?: string) => {
    const difficultyColors: Record<string, string> = {
      'beginner': 'bg-green-50 text-green-700',
      'intermediate': 'bg-yellow-50 text-yellow-700',
      'advanced': 'bg-red-50 text-red-700'
    };
    
    return difficulty && difficultyColors[difficulty] ? difficultyColors[difficulty] : 'bg-gray-50 text-gray-700';
  };

  // Only render the modal on the client side
  if (!mounted || !isOpen) return null;

  // Use createPortal to render the modal at the root level of the DOM
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {loading ? 'Loading Activity...' : activity?.title || 'Activity Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Success message if present */}
        {successMessage && (
          <div className="bg-green-50 text-green-700 p-4 border-b border-green-100 flex items-center">
            <Loader2 className="h-5 w-5 mr-2 flex-shrink-0 animate-spin" />
            {successMessage}
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleTabChange('details')}
            className={`px-6 py-3 text-sm font-medium flex items-center ${
              activeTab === 'details'
                ? 'text-emerald-600 border-b-2 border-emerald-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Activity Details
          </button>
          <button
            onClick={() => handleTabChange('observation')}
            className={`px-6 py-3 text-sm font-medium flex items-center ${
              activeTab === 'observation'
                ? 'text-emerald-600 border-b-2 border-emerald-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Record Observation
          </button>
        </div>
        
        {/* Modal content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="p-6 text-red-500">{error}</div>
          ) : activeTab === 'details' ? (
            // Activity details tab
            <div className="p-6 space-y-6">
              {/* Category and difficulty */}
              <div className="flex flex-wrap gap-2">
                {activity?.area && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAreaColor(activity.area)}`}>
                    {activity.area.replace('_', ' ')}
                  </span>
                )}
                {activity?.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(activity.difficulty)}`}>
                    {activity.difficulty}
                  </span>
                )}
                {activity?.duration && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {activity.duration} min
                  </span>
                )}
                {activity?.ageRanges && activity.ageRanges.map(age => (
                  <span key={age} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    Age {age}
                  </span>
                ))}
              </div>
              
              {/* Description */}
              {activity?.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600">{activity.description}</p>
                </div>
              )}
              
              {/* Instructions */}
              {activity?.instructions && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions</h3>
                  <p className="text-gray-600 whitespace-pre-line">{activity.instructions}</p>
                </div>
              )}
              
              {/* Materials needed */}
              {activity?.materialsNeeded && activity.materialsNeeded.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Materials Needed</h3>
                  <ul className="list-disc pl-5 text-gray-600 space-y-1">
                    {activity.materialsNeeded.map((material, index) => (
                      <li key={index}>{material}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Skills addressed */}
              {activity?.skillsAddressed && activity.skillsAddressed.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Skills Addressed</h3>
                  <div className="flex flex-wrap gap-2">
                    {activity.skillsAddressed.map((skillId) => (
                      <span key={skillId} className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        {skillId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Record observation button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => handleTabChange('observation')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Record Observation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            // Observation tab
            <div className="p-6">
              <ActivityObservationForm
                activityId={activityId}
                childId={childId}
                onSuccess={handleObservationSuccess}
                onClose={onClose}
                weeklyPlanId={weeklyPlanId} // Pass weeklyPlanId to the form
                dayOfWeek={dayOfWeek}       // Pass dayOfWeek to the form
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}