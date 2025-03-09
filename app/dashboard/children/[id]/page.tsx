import React, { useState } from 'react';
import { Camera, Smile, Frown, Meh, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

// Define strict types
type EngagementLevel = 'low' | 'medium' | 'high';

interface Skill {
  id: string;
  name: string;
}

interface QuickObservationFormProps {
  activityId: string;
  childId: string;
  activityTitle?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

const QuickObservationForm: React.FC<QuickObservationFormProps> = ({ 
  activityId, 
  childId, 
  activityTitle, 
  onSuccess, 
  onClose 
}) => {
  // State with proper type annotations
  const [note, setNote] = useState<string>('');
  const [engagement, setEngagement] = useState<EngagementLevel>('medium');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Define sample skills (in a real app this would come from props or API)
  const skillOptions: Skill[] = [
    { id: 'skill1', name: 'Fine Motor Control' },
    { id: 'skill2', name: 'Concentration' },
    { id: 'skill3', name: 'Independence' }
  ];
  
  // Event handlers with proper types
  const handleEngagementSelect = (level: EngagementLevel): void => {
    setEngagement(level);
  };
  
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (event: ProgressEvent<FileReader>) => {
      // Safely access result with proper nullish checks
      const result = event.target?.result;
      if (typeof result === 'string') {
        setPhotoPreview(result);
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  const handleSkillToggle = (skillId: string): void => {
    setSelectedSkills(prev => {
      if (prev.includes(skillId)) {
        return prev.filter(id => id !== skillId);
      } else {
        return [...prev, skillId];
      }
    });
  };
  
  const handleSubmit = async (): Promise<void> => {
    try {
      setSubmitting(true);
      
      // Sample submission data
      const submissionData = {
        activityId,
        childId,
        note,
        engagement,
        skills: selectedSkills,
        hasPhoto: !!photoPreview
      };
      
      console.log('Submitting observation:', submissionData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting observation:', error);
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
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
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
            {/* Low engagement button */}
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
            
            {/* Medium engagement button */}
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
            
            {/* High engagement button */}
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
                onClick={() => setPhotoPreview(null)}
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
                <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-20 border-t-white rounded-full mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Observation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickObservationForm;