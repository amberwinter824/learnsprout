// app/components/ChildProfileForm.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAgeGroup, getAgeGroupDescription } from '@/lib/ageUtils';
import { createChild, updateChild } from '@/lib/dataService';
import { AlertCircle, Loader2 } from 'lucide-react';

// Define interests appropriate for all age ranges
const INTEREST_OPTIONS = [
  // Infant interests (0-1)
  { 
    value: "music", 
    label: "Music & Sounds", 
    description: "Enjoys listening to music, making sounds, or playing with musical toys",
    ageGroups: ["0-1", "1-2", "2-3", "3-4", "4-5", "5-6"] 
  },
  { 
    value: "visual", 
    label: "Visual Stimulation", 
    description: "Fascinated by bright colors, patterns, or watching objects move",
    ageGroups: ["0-1", "1-2"] 
  },
  { 
    value: "touch", 
    label: "Tactile Exploration", 
    description: "Loves touching different textures, feeling objects, or exploring with hands",
    ageGroups: ["0-1", "1-2", "2-3"] 
  },
  
  // Toddler interests (1-3)
  { 
    value: "movement", 
    label: "Movement & Motion", 
    description: "Enjoys physical activities like crawling, walking, climbing, or dancing",
    ageGroups: ["0-1", "1-2", "2-3", "3-4"] 
  },
  { 
    value: "objects", 
    label: "Object Permanence", 
    description: "Shows understanding that objects still exist even when hidden (e.g., playing peek-a-boo, looking for hidden toys)",
    ageGroups: ["0-1", "1-2"] 
  },
  { 
    value: "stacking", 
    label: "Stacking & Nesting", 
    description: "Likes building towers, stacking blocks, or fitting objects inside each other",
    ageGroups: ["1-2", "2-3"] 
  },
  { 
    value: "water", 
    label: "Water Play", 
    description: "Enjoys playing with water, splashing, or water-based activities",
    ageGroups: ["1-2", "2-3", "3-4", "4-5"] 
  },
  { 
    value: "practical_life", 
    label: "Practical Life Activities", 
    description: "Interested in everyday tasks like pouring, sorting, or helping with simple chores",
    ageGroups: ["1-2", "2-3", "3-4", "4-5", "5-6"] 
  },
  
  // Preschool interests (3-6)
  { 
    value: "art", 
    label: "Art & Creating", 
    description: "Enjoys drawing, painting, or making crafts",
    ageGroups: ["2-3", "3-4", "4-5", "5-6"] 
  },
  { 
    value: "nature", 
    label: "Nature & Animals", 
    description: "Fascinated by plants, animals, or outdoor exploration",
    ageGroups: ["1-2", "2-3", "3-4", "4-5", "5-6"] 
  },
  { 
    value: "numbers", 
    label: "Numbers & Counting", 
    description: "Shows interest in counting, recognizing numbers, or basic math concepts",
    ageGroups: ["2-3", "3-4", "4-5", "5-6"] 
  },
  { 
    value: "letters", 
    label: "Letters & Words", 
    description: "Interested in letters, words, or early reading activities",
    ageGroups: ["2-3", "3-4", "4-5", "5-6"] 
  },
  { 
    value: "building", 
    label: "Building & Construction", 
    description: "Enjoys building with blocks, creating structures, or assembling things",
    ageGroups: ["1-2", "2-3", "3-4", "4-5", "5-6"] 
  },
  { 
    value: "pretend", 
    label: "Pretend Play", 
    description: "Loves imaginative play, role-playing, or make-believe activities",
    ageGroups: ["2-3", "3-4", "4-5", "5-6"] 
  },
  { 
    value: "sensory", 
    label: "Sensory Exploration", 
    description: "Enjoys activities that engage the senses (touch, smell, taste, sight, sound)",
    ageGroups: ["0-1", "1-2", "2-3", "3-4", "4-5"] 
  }
];

// Define form validation rules
const MAX_BIRTHDATE = new Date(); // Today (can't be born in the future)
const MIN_BIRTHDATE = new Date(); 
MIN_BIRTHDATE.setFullYear(MIN_BIRTHDATE.getFullYear() - 7); // Up to 7 years old

// Child profile form properties
interface ChildProfileFormProps {
  initialData?: {
    id?: string;
    name?: string;
    birthDate?: Date;
    birthDateString?: string;
    interests?: string[];
    notes?: string;
    [key: string]: any;
  };
  onComplete?: (childId: string) => void;
  mode?: 'create' | 'edit';
}

export default function ChildProfileForm({ 
  initialData = {}, 
  onComplete, 
  mode = 'create' 
}: ChildProfileFormProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  // Form state
  const [name, setName] = useState(initialData.name || '');
  const [birthDate, setBirthDate] = useState<Date | null>(
    initialData.birthDateString ? new Date(initialData.birthDateString + 'T12:00:00') :
    initialData.birthDate || null
  );
  const [ageGroup, setAgeGroup] = useState<string>('');
  const [interests, setInterests] = useState<string[]>(initialData.interests || []);
  const [notes, setNotes] = useState(initialData.notes || '');
  
  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filteredInterests, setFilteredInterests] = useState(INTEREST_OPTIONS);
  
  // Effect to calculate age group when birthdate changes
  useEffect(() => {
    if (birthDate) {
      const calculatedAgeGroup = calculateAgeGroup(birthDate);
      setAgeGroup(calculatedAgeGroup);
      
      // Filter interests based on calculated age group
      const filtered = INTEREST_OPTIONS.filter(
        option => option.ageGroups.includes(calculatedAgeGroup)
      );
      setFilteredInterests(filtered);
      
      // Remove any interests that are no longer valid for the age group
      setInterests(prevInterests => 
        prevInterests.filter(interest => 
          filtered.some(option => option.value === interest)
        )
      );
    }
  }, [birthDate]);
  
  // Handle birthdate change with validation
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputDate = new Date(e.target.value + 'T12:00:00');
    
    // Validate date range
    if (inputDate > MAX_BIRTHDATE) {
      setError("Birth date cannot be in the future");
      return;
    }
    
    if (inputDate < MIN_BIRTHDATE) {
      setError("This platform is designed for children up to 7 years old");
      return;
    }
    
    // Clear any previous errors and set the birthdate
    setError('');
    setBirthDate(inputDate);
  };
  
  // Toggle interest selection
  const toggleInterest = (interestValue: string) => {
    setInterests(prev => {
      if (prev.includes(interestValue)) {
        return prev.filter(i => i !== interestValue);
      } else {
        return [...prev, interestValue];
      }
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to create a child profile');
      return;
    }
    
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    
    if (!birthDate) {
      setError('Please enter a birth date');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Store birthdate as a string in YYYY-MM-DD format instead of Timestamp
      const birthDateString = birthDate.toISOString().split('T')[0];
      
      // Prepare child data
      const childData = {
        name: name.trim(),
        birthDateString, // Store as string instead of Timestamp
        ageGroup,
        interests,
        notes: notes.trim(),
        active: true,
        userId: currentUser.uid
      };
      
      let childId;
      
      if (mode === 'edit' && initialData.id) {
        // Update existing child
        await updateChild(initialData.id, childData);
        childId = initialData.id;
      } else {
        // Create new child
        childId = await createChild(currentUser.uid, childData);
      }
      
      // Call the completion handler if provided
      if (onComplete && childId) {
        onComplete(childId);
      } else {
        // Otherwise redirect to the child's profile
        router.push(`/children/${childId}`);
      }
    } catch (err: any) {
      console.error('Error saving child profile:', err);
      setError(err.message || 'Failed to save child profile');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for input field
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    
    return date.toISOString().split('T')[0];
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {mode === 'create' ? 'Add Child Profile' : 'Edit Child Profile'}
        </h2>
        
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Child Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Child's Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              placeholder="Enter child's name"
              required
            />
          </div>
          
          {/* Birth Date */}
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
              Birth Date
            </label>
            <input
              type="date"
              id="birthDate"
              value={formatDateForInput(birthDate)}
              onChange={handleBirthDateChange}
              max={formatDateForInput(MAX_BIRTHDATE)}
              min={formatDateForInput(MIN_BIRTHDATE)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              required
            />
          </div>
          
          {/* Age Group (Calculated Automatically) */}
          {ageGroup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age Group (Auto-calculated)
              </label>
              <div className="mt-1 block w-full bg-gray-50 border border-gray-200 rounded-md py-2 px-3 text-gray-700 sm:text-sm">
                {getAgeGroupDescription(ageGroup)}
              </div>
            </div>
          )}
          
          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interests
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select all that apply. These help us suggest appropriate activities. Each interest includes a description to help you understand what it means.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredInterests.map((option) => (
                <label 
                  key={option.value} 
                  className={`
                    inline-flex flex-col px-3 py-2 rounded border 
                    ${interests.includes(option.value) 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}
                    cursor-pointer text-sm transition-colors
                  `}
                >
                  <input
                    type="checkbox"
                    checked={interests.includes(option.value)}
                    onChange={() => toggleInterest(option.value)}
                    className="sr-only"
                  />
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs mt-1 opacity-75">{option.description}</span>
                </label>
              ))}
            </div>
            {filteredInterests.length === 0 && (
              <p className="text-gray-500 italic text-sm">
                Please select a birth date to see age-appropriate interests
              </p>
            )}
          </div>
          
          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              placeholder="Any additional information or notes about your child"
            ></textarea>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                mode === 'create' ? 'Create Profile' : 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}