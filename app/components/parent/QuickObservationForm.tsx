"use client";
import React, { useState, useEffect } from 'react';
import { Camera, Smile, Frown, Meh, CheckCircle, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

// Define simple types
type EngagementLevel = 'low' | 'medium' | 'high';

interface Skill {
  id: string;
  name: string;
  description: string;
  area: string;
  status?: 'not_started' | 'emerging' | 'developing' | 'mastered';
}

interface QuickObservationFormProps {
  activityId?: string;
  childId: string;
  childName?: string;
  activityTitle?: string;
  weeklyPlanId?: string;
  dayOfWeek?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

const QuickObservationForm: React.FC<QuickObservationFormProps> = (props) => {
  const { 
    activityId, 
    childId, 
    childName, 
    activityTitle, 
    weeklyPlanId, 
    dayOfWeek, 
    onSuccess, 
    onClose 
  } = props;
  
  // Basic state declarations
  const [note, setNote] = useState("");
  const [engagement, setEngagement] = useState<EngagementLevel>("medium");
  const [interest, setInterest] = useState<EngagementLevel>("medium");
  const [difficulty, setDifficulty] = useState<'easy' | 'appropriate' | 'challenging'>('appropriate');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Record<string, 'not_started' | 'emerging' | 'developing' | 'mastered'>>({});
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activitySkills, setActivitySkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch activity skills when component mounts
  useEffect(() => {
    async function fetchActivitySkills() {
      if (!activityId) {
        setLoading(false);
        return;
      }

      try {
        // Get activity document
        const activityDoc = await getDoc(doc(db, 'activities', activityId));
        if (!activityDoc.exists()) {
          console.error('Activity not found');
          setLoading(false);
          return;
        }

        const activityData = activityDoc.data();
        if (!activityData.skillsAddressed?.length) {
          setLoading(false);
          return;
        }

        // Get skill documents
        const skillPromises = activityData.skillsAddressed.map(
          (skillId: string) => getDoc(doc(db, 'developmentalSkills', skillId))
        );

        const skillDocs = await Promise.all(skillPromises);
        const skills = skillDocs
          .filter(doc => doc.exists())
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Skill));

        setActivitySkills(skills);
      } catch (err) {
        console.error('Error fetching activity skills:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchActivitySkills();
  }, [activityId]);
  
  // Simplified handlers
  const handleEngagementSelect = (level: EngagementLevel) => {
    setEngagement(level);
  };

  const handleInterestSelect = (level: EngagementLevel) => {
    setInterest(level);
  };

  const handleDifficultySelect = (level: 'easy' | 'appropriate' | 'challenging') => {
    setDifficulty(level);
  };
  
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setPhotoPreview(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSkillStatusChange = (skillId: string, status: 'not_started' | 'emerging' | 'developing' | 'mastered') => {
    setSelectedSkills(prev => ({
      ...prev,
      [skillId]: status
    }));
  };
  
  // Upload a photo to Firebase Storage
  const uploadPhoto = async (file: File): Promise<string> => {
    try {
      const storageRef = ref(storage, `progress/${childId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (err) {
      console.error("Error uploading photo:", err);
      throw err;
    }
  };
  
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Upload photo if one was provided
      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }
      
      // Create observation data object
      const observationData = {
        childId,
        activityId: activityId || 'general_observation',
        date: new Date(),
        completionStatus: 'completed',
        engagementLevel: engagement,
        interestLevel: interest,
        completionDifficulty: difficulty,
        notes: note,
        photoUrls: photoUrl ? [photoUrl] : [],
        skillsDemonstrated: Object.entries(selectedSkills).map(([skillId, status]) => ({
          skillId,
          status,
          date: new Date()
        })),
        // Environment context fields
        environmentContext: 'home', // Default for quick observations
        observationType: 'general',
        visibility: ['all'], // Visible to all by default
        // Additional tracking fields
        weeklyPlanId: weeklyPlanId || null,
        dayOfWeek: dayOfWeek || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add to Firestore
      const progressRef = collection(db, 'progressRecords');
      const docRef = await addDoc(progressRef, observationData);
      
      console.log('Observation saved with ID:', docRef.id);
      
      // Try to update the weekly plan
      try {
        // First check if we have weeklyPlanId and dayOfWeek from props
        if (weeklyPlanId && dayOfWeek) {
          const planRef = doc(db, 'weeklyPlans', weeklyPlanId);
          const planDoc = await getDoc(planRef);
          
          if (planDoc.exists()) {
            const planData = planDoc.data();
            const dayKey = dayOfWeek.toLowerCase();
            
            if (planData[dayKey]) {
              const dayActivities = [...planData[dayKey]];
              
              // Find the activity and update its status
              const activityIndex = dayActivities.findIndex(a => a.activityId === activityId);
              if (activityIndex !== -1) {
                dayActivities[activityIndex] = {
                  ...dayActivities[activityIndex],
                  status: 'completed'
                };
                
                // Update the plan
                await updateDoc(planRef, {
                  [dayKey]: dayActivities,
                  updatedAt: serverTimestamp()
                });
                
                console.log(`Updated activity status in weekly plan ${weeklyPlanId}`);
              }
            }
          }
        } 
        // If we don't have weeklyPlanId and dayOfWeek from props, try to extract from activity.id
        else {
          // Extract planId from activity.id (assuming format: planId_dayOfWeek_activityId)
          const activityIdParts = activityId?.split('_');
          if (activityIdParts && activityIdParts.length >= 3) {
            const planId = activityIdParts[0];
            const dayOfWeek = activityIdParts[1];
            
            // Update the plan
            const planRef = doc(db, 'weeklyPlans', planId);
            const planDoc = await getDoc(planRef);
            
            if (planDoc.exists()) {
              const planData = planDoc.data();
              const dayKey = dayOfWeek.toLowerCase();
              const dayActivities = planData[dayKey] || [];
              
              // Find and update the activity status
              const updatedActivities = dayActivities.map((act: any) => {
                if (act.activityId === activityId) {
                  return { ...act, status: 'completed' };
                }
                return act;
              });
              
              // Update the plan document
              await updateDoc(planRef, {
                [dayKey]: updatedActivities,
                updatedAt: serverTimestamp()
              });
              
              console.log(`Updated activity status in weekly plan ${planId}`);
            }
          }
        }
      } catch (planError) {
        console.error('Error updating weekly plan:', planError);
        // Continue even if plan update fails - the observation was saved
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error saving observation:', err);
      setError('Failed to save observation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden max-w-md mx-auto flex flex-col h-[90vh]">
      {/* Fixed Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
        <h3 className="font-medium">Quick Observation</h3>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600" 
            type="button"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error message */}
        {error && (
          <div className="mx-4 mt-3 p-2 bg-red-50 text-red-700 text-sm rounded-md">
            {error}
          </div>
        )}
        
        {/* Main form */}
        <div className="p-4">
          {/* Activity title display */}
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-1">Activity</div>
            <div className="font-medium">{activityTitle || 'Untitled Activity'}</div>
          </div>
          
          {/* Engagement selection with emoji faces */}
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">How did it go?</div>
            <div className="flex justify-between text-center">
              <button
                onClick={() => handleEngagementSelect('low')}
                className={`flex-1 py-2 px-1 rounded-l-lg flex flex-col items-center ${
                  engagement === 'low' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                }`}
                type="button"
              >
                <Frown className={`h-6 w-6 mb-1 ${engagement === 'low' ? 'text-red-500' : 'text-gray-400'}`} />
                <span className="text-xs">Challenging</span>
              </button>
              
              <button
                onClick={() => handleEngagementSelect('medium')}
                className={`flex-1 py-2 px-1 border-x border-white flex flex-col items-center ${
                  engagement === 'medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'
                }`}
                type="button"
              >
                <Meh className={`h-6 w-6 mb-1 ${engagement === 'medium' ? 'text-yellow-500' : 'text-gray-400'}`} />
                <span className="text-xs">OK</span>
              </button>
              
              <button
                onClick={() => handleEngagementSelect('high')}
                className={`flex-1 py-2 px-1 rounded-r-lg flex flex-col items-center ${
                  engagement === 'high' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                }`}
                type="button"
              >
                <Smile className={`h-6 w-6 mb-1 ${engagement === 'high' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="text-xs">Great</span>
              </button>
            </div>
          </div>
          
          {/* Interest level selection */}
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">Child's interest</div>
            <div className="flex justify-between text-center">
              <button
                onClick={() => handleInterestSelect('low')}
                className={`flex-1 py-2 px-1 rounded-l-lg text-sm ${
                  interest === 'low' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                }`}
                type="button"
              >
                Low
              </button>
              
              <button
                onClick={() => handleInterestSelect('medium')}
                className={`flex-1 py-2 px-1 border-x border-white text-sm ${
                  interest === 'medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'
                }`}
                type="button"
              >
                Medium
              </button>
              
              <button
                onClick={() => handleInterestSelect('high')}
                className={`flex-1 py-2 px-1 rounded-r-lg text-sm ${
                  interest === 'high' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                }`}
                type="button"
              >
                High
              </button>
            </div>
          </div>
          
          {/* Difficulty level selection */}
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">Difficulty for child</div>
            <div className="flex justify-between text-center">
              <button
                onClick={() => handleDifficultySelect('easy')}
                className={`flex-1 py-2 px-1 rounded-l-lg text-sm ${
                  difficulty === 'easy' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                }`}
                type="button"
              >
                Easy
              </button>
              
              <button
                onClick={() => handleDifficultySelect('appropriate')}
                className={`flex-1 py-2 px-1 border-x border-white text-sm ${
                  difficulty === 'appropriate' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                }`}
                type="button"
              >
                Just Right
              </button>
              
              <button
                onClick={() => handleDifficultySelect('challenging')}
                className={`flex-1 py-2 px-1 rounded-r-lg text-sm ${
                  difficulty === 'challenging' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'
                }`}
                type="button"
              >
                Challenging
              </button>
            </div>
          </div>

          {/* Skill Tracking Section */}
          {activitySkills.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">Track Skill Progress</div>
              <div className="space-y-3">
                {activitySkills.map(skill => (
                  <div key={skill.id} className="border rounded-lg p-3">
                    <div className="mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{skill.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{skill.description}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => handleSkillStatusChange(skill.id, 'not_started')}
                        className={`px-2 py-1.5 text-xs rounded-md flex items-center justify-center ${
                          selectedSkills[skill.id] === 'not_started'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}
                        type="button"
                      >
                        Not Started
                      </button>
                      <button
                        onClick={() => handleSkillStatusChange(skill.id, 'emerging')}
                        className={`px-2 py-1.5 text-xs rounded-md flex items-center justify-center ${
                          selectedSkills[skill.id] === 'emerging'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}
                        type="button"
                      >
                        Emerging
                      </button>
                      <button
                        onClick={() => handleSkillStatusChange(skill.id, 'developing')}
                        className={`px-2 py-1.5 text-xs rounded-md flex items-center justify-center ${
                          selectedSkills[skill.id] === 'developing'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}
                        type="button"
                      >
                        Developing
                      </button>
                      <button
                        onClick={() => handleSkillStatusChange(skill.id, 'mastered')}
                        className={`px-2 py-1.5 text-xs rounded-md flex items-center justify-center ${
                          selectedSkills[skill.id] === 'mastered'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}
                        type="button"
                      >
                        Mastered
                      </button>
                    </div>
                    {selectedSkills[skill.id] && (
                      <div className="mt-2 text-xs text-gray-500">
                        {selectedSkills[skill.id] === 'not_started' && 'Child has not yet attempted this skill'}
                        {selectedSkills[skill.id] === 'emerging' && 'Child is beginning to show interest and initial attempts'}
                        {selectedSkills[skill.id] === 'developing' && 'Child shows growing competence with some support'}
                        {selectedSkills[skill.id] === 'mastered' && 'Child consistently demonstrates the skill independently'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Quick note */}
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-1">Quick note (optional)</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="What did you notice?"
              rows={2}
            />
          </div>
          
          {/* Photo capture */}
          <div className="mb-4">
            <div className="flex items-center">
              <label className="flex items-center justify-center w-full py-2 bg-gray-50 hover:bg-gray-100 rounded-md cursor-pointer">
                <Camera className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-sm">Take a photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoCapture} 
                  capture="environment"
                />
              </label>
            </div>
            
            {photoPreview && (
              <div className="mt-2 relative">
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="h-20 w-20 object-cover rounded-md border border-gray-200"
                />
                <button
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoFile(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white sticky bottom-0 z-10">
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md flex items-center justify-center disabled:opacity-50"
            type="button"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>Save Observation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickObservationForm;