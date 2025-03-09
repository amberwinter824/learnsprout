"use client";
import React, { useState } from 'react';
import { Camera, Smile, Frown, Meh, CheckCircle, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

// Define simple types
type EngagementLevel = 'low' | 'medium' | 'high';

interface Skill {
  id: string;
  name: string;
}

interface QuickObservationFormProps {
  activityId: string;
  childId: string;
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
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Simplified skill options - in a real implementation, these would be loaded from Firebase
  const skillOptions = [
    { id: 'skill1', name: 'Fine Motor Control' },
    { id: 'skill2', name: 'Concentration' },
    { id: 'skill3', name: 'Independence' }
  ];
  
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
  
  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId) 
        : [...prev, skillId]
    );
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
        activityId,
        date: new Date(),
        completionStatus: 'completed',
        engagementLevel: engagement,
        interestLevel: interest,
        completionDifficulty: difficulty,
        notes: note,
        photoUrls: photoUrl ? [photoUrl] : [],
        skillsDemonstrated: selectedSkills,
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
      
      // If a weekly plan ID was provided, update the activity status to completed
      if (weeklyPlanId && dayOfWeek) {
        try {
          const { doc, getDoc, updateDoc } = await import('firebase/firestore');
          
          // Get the weekly plan document
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
        } catch (planError) {
          console.error('Error updating weekly plan:', planError);
          // Continue even if plan update fails - the observation was saved
        }
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
    <div className="bg-white rounded-lg shadow-sm overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
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
        
        {/* Advanced options toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md text-sm"
            type="button"
          >
            <span>Advanced options</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {showAdvanced && (
            <div className="mt-3 p-3 border border-gray-200 rounded-md">
              <div className="text-sm text-gray-500 mb-2">Skills observed</div>
              <div className="space-y-2">
                {skillOptions.map(skill => (
                  <label key={skill.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={() => handleSkillToggle(skill.id)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Submit button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md flex items-center disabled:opacity-50"
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