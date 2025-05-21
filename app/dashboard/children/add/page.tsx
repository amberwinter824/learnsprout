"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createChild } from '@/lib/dataService';
import { ArrowLeft, AlertCircle, Calendar, CheckCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { 
  calculateAgeGroup, 
  getAgeGroupDescription, 
  formatAge, 
  isValidBirthdate,
  getAgeAppropriateInterests,
  getAllAgeGroups
} from '@/lib/ageUtils';
import DevelopmentAssessment from '@/components/DevelopmentAssessment';
import DevelopmentPlan from '@/components/DevelopmentPlan';
import { query, collection, getDocs, writeBatch, doc, Timestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import InitialAssessment from '@/components/InitialAssessment';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { RiCheckboxCircleFill } from 'react-icons/ri';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { DevelopmentalSkill } from '@/lib/types/enhancedSchema';

interface Interest {
  value: string;
  label: string;
}

interface ParentInput {
  concerns: string[];
  goals: string[];
  notes: string;
}

interface AssessmentResult {
  skillId: string;
  status: 'emerging' | 'developing' | 'mastered';
  notes?: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  area: string;
  skillsAddressed: string[];
  duration: number;
  difficulty: string;
}

interface DevelopmentPlan {
  strengths: {
    skill: DevelopmentalSkill;
    activities: Activity[];
  }[];
  growthAreas: {
    skill: DevelopmentalSkill;
    activities: Activity[];
  }[];
  maintenance: {
    skill: DevelopmentalSkill;
    activities: Activity[];
  }[];
}

export default function AddChildPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  // Form state
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [ageGroup, setAgeGroup] = useState('');
  const [formattedAge, setFormattedAge] = useState('');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [developmentPlan, setDevelopmentPlan] = useState<DevelopmentPlan | null>(null);
  
  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [birthdateError, setBirthdateError] = useState('');
  const [showAssessment, setShowAssessment] = useState(false);
  const [showDevelopmentPlan, setShowDevelopmentPlan] = useState(false);
  const [step, setStep] = useState('assessment');
  const [parentInput, setParentInput] = useState<ParentInput>({
    concerns: [],
    goals: [],
    notes: ''
  });
  const [newConcern, setNewConcern] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [childId, setChildId] = useState<string>('');

  // Add an effect to wait for the auth state to be properly loaded
  useEffect(() => {
    if (currentUser !== null) {
      setAuthChecked(true);
    }
  }, [currentUser]);

  // Effect to calculate age group when birthdate changes
  useEffect(() => {
    if (birthDate) {
      try {
        // Validate birthdate
        if (!isValidBirthdate(birthDate)) {
          setBirthdateError('Please enter a valid birth date');
          return;
        }

        const age = formatAge(birthDate);
        setFormattedAge(age);
        
        const group = calculateAgeGroup(birthDate);
        setAgeGroup(group);
        
        // Get age-appropriate interests
        const ageInterests = getAgeAppropriateInterests(group);
        setAvailableInterests(ageInterests);
        
        // Clear any previous errors
        setBirthdateError('');
      } catch (err) {
        console.error('Error calculating age:', err);
        setBirthdateError('Error calculating age. Please try again.');
      }
    }
  }, [birthDate]);

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setBirthDate(date);
    setBirthdateError('');
  };

  const toggleInterest = (interestValue: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestValue)
        ? prev.filter(i => i !== interestValue)
        : [...prev, interestValue]
    );
  };

  const handleAssessmentComplete = async (results: AssessmentResult[]) => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        throw new Error('You must be logged in to add a child');
      }

      if (!childId) {
        throw new Error('Child ID not found');
      }

      // Create child skills records in a batch
      const batch = writeBatch(db);
      results.forEach(result => {
        const skillRef = doc(collection(db, 'childSkills'));
        batch.set(skillRef, {
          childId,
          skillId: result.skillId,
          status: result.status,
          lastAssessed: Timestamp.fromDate(new Date()),
          notes: result.notes || '',
          observations: result.notes ? [result.notes] : [],
          observationDates: [new Date()],
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        });
      });
      
      // Commit the skills batch
      await batch.commit();
      
      setAssessmentResults(results);
    } catch (err) {
      console.error('Error saving assessment results:', err);
      setError(err instanceof Error ? err.message : 'Failed to save assessment results');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWeeklyPlan = (plan: DevelopmentPlan) => {
    // Store the plan in state for later use
    setDevelopmentPlan(plan);
    setShowDevelopmentPlan(false);
    // Continue with child creation
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleStartAssessment = async () => {
    if (!birthDate) {
      setBirthdateError('Please enter a birth date before starting the assessment');
      return;
    }
    if (!name.trim()) {
      setError('Please enter a name before starting the assessment');
      return;
    }

    try {
      setLoading(true);
      
      if (!currentUser) {
        throw new Error('You must be logged in to add a child');
      }

      // Create child document first
      const childRef = doc(collection(db, 'children'));
      const childData = {
        name: name.trim(),
        birthDateString: birthDate.toISOString().split('T')[0],
        birthDate: Timestamp.fromDate(birthDate),
        ageGroup: calculateAgeGroup(birthDate),
        interests: selectedInterests,
        parentInput,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        userId: currentUser.uid,
        // Add access control fields
        access: {
          [currentUser.uid]: {
            role: 'parent',
            addedAt: Timestamp.fromDate(new Date())
          }
        }
      };
      
      // Set the child document first
      await setDoc(childRef, childData);
      const newChildId = childRef.id;
      setChildId(newChildId);

      // Create an access control document
      const accessRef = doc(db, 'access', newChildId);
      await setDoc(accessRef, {
        [currentUser.uid]: {
          role: 'parent',
          addedAt: Timestamp.fromDate(new Date())
        }
      });
      
      // Redirect to the dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Error creating child:', err);
      setError(err instanceof Error ? err.message : 'Failed to create child');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!currentUser) {
        throw new Error('You must be logged in to add a child');
      }

      // If childId doesn't exist, create the child first
      if (!childId) {
        const childRef = doc(collection(db, 'children'));
        const childData = {
          name: name.trim(),
          birthDateString: birthDate!.toISOString().split('T')[0],
          birthDate: Timestamp.fromDate(birthDate!),
          ageGroup,
          interests: selectedInterests,
          parentInput,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date()),
          userId: currentUser.uid,
          // Add access control fields
          access: {
            [currentUser.uid]: {
              role: 'parent',
              addedAt: Timestamp.fromDate(new Date())
            }
          }
        };
        
        // Create the child document
        await setDoc(childRef, childData);
        const newChildId = childRef.id;
        setChildId(newChildId);

        // Create an access control document
        const accessRef = doc(db, 'access', newChildId);
        await setDoc(accessRef, {
          [currentUser.uid]: {
            role: 'parent',
            addedAt: Timestamp.fromDate(new Date())
          }
        });
        
        // Redirect to the dashboard
        router.push('/dashboard');
        return;
      }

      // Update existing child document
      const childRef = doc(db, 'children', childId);
      await updateDoc(childRef, {
        name: name.trim(),
        birthDate: Timestamp.fromDate(birthDate!),
        ageGroup,
        interests: selectedInterests,
        parentInput,
        updatedAt: Timestamp.fromDate(new Date())
      });
      
      // Create child skills records from assessment results if they exist
      if (assessmentResults.length > 0) {
        const batch = writeBatch(db);
        
        assessmentResults.forEach(result => {
          const skillRef = doc(collection(db, 'childSkills'));
          batch.set(skillRef, {
            childId,
            skillId: result.skillId,
            status: result.status,
            lastAssessed: Timestamp.fromDate(new Date()),
            notes: result.notes || '',
            observations: result.notes ? [result.notes] : [],
            observationDates: [Timestamp.fromDate(new Date())],
            createdAt: Timestamp.fromDate(new Date()),
            updatedAt: Timestamp.fromDate(new Date())
          });
        });
        
        await batch.commit();
        console.log('Saved assessment results as child skills with observations');
      }
      
      // Redirect to the dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error updating child:', err);
      setError(err.message || 'Failed to update child');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-sm text-gray-600">
              You must be logged in to add a child.
            </p>
            <div className="mt-4">
              <Link
                href="/login"
                className="text-emerald-600 hover:text-emerald-500"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showDevelopmentPlan && assessmentResults.length > 0) {
    return (
      <DevelopmentPlan
        childName={name}
        assessmentResults={assessmentResults}
        parentInput={parentInput}
        onBack={() => {
          setShowDevelopmentPlan(false);
          setShowAssessment(true);
        }}
        onGenerateWeeklyPlan={handleGenerateWeeklyPlan}
      />
    );
  }

  if (showAssessment) {
    return (
      <InitialAssessment
        childName={name}
        childId={childId}
        birthDate={birthDate!}
        onComplete={handleAssessmentComplete}
        onBack={() => setShowAssessment(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a Child</h1>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-emerald-800 mb-2">Welcome to Learn Sprout!</h2>
          <p className="text-emerald-700 mb-2">
            We're here to help you track and support your child's development journey. Let's start by gathering some basic information about your child.
          </p>
          <p className="text-emerald-700">
            After entering your child's details, you'll have the option to complete a development assessment. This will help us understand your child's current skills and create a personalized learning plan.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Child's Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                Birth Date
              </label>
              <div className="mt-1 relative">
                <input
                  type="date"
                  id="birthDate"
                  value={formatDateForInput(birthDate)}
                  onChange={handleBirthDateChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
                <Calendar className="absolute right-3 top-2 h-5 w-5 text-gray-400" />
              </div>
              {birthdateError && (
                <p className="mt-1 text-sm text-red-600">{birthdateError}</p>
              )}
              {formattedAge && (
                <p className="mt-1 text-sm text-gray-500">
                  Age: {formattedAge} ({getAgeGroupDescription(ageGroup)})
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Child's Interests
              </label>
              <p className="text-gray-600 text-sm mb-3">
                Select activities and topics that your child enjoys or shows interest in. This helps us suggest engaging learning experiences.
              </p>
              {birthDate ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableInterests.map((interest) => (
                    <button
                      key={interest.value}
                      type="button"
                      onClick={() => toggleInterest(interest.value)}
                      className={`p-3 text-sm rounded-lg text-left transition-colors ${
                        selectedInterests.includes(interest.value)
                          ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
                          : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      {interest.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Please enter your child's birth date to see age-appropriate interests
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent's Concerns
              </label>
              <p className="text-gray-600 text-sm mb-3">
                Share any concerns you have about your child's development. This helps us focus on areas that matter most to you.
              </p>
              <div className="space-y-2">
                {parentInput.concerns.map((concern, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">
                      {concern}
                    </span>
                    <button
                      onClick={() => setParentInput(prev => ({
                        ...prev,
                        concerns: prev.concerns.filter((_, i) => i !== index)
                      }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newConcern}
                    onChange={(e) => setNewConcern(e.target.value)}
                    placeholder="Enter a concern"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => {
                      if (newConcern.trim()) {
                        setParentInput(prev => ({
                          ...prev,
                          concerns: [...prev.concerns, newConcern.trim()]
                        }));
                        setNewConcern('');
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Development Goals
              </label>
              <p className="text-gray-600 text-sm mb-3">
                What would you like your child to achieve in the next few months? Your goals help us create a more personalized development plan.
              </p>
              <div className="space-y-2">
                {parentInput.goals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">
                      {goal}
                    </span>
                    <button
                      onClick={() => setParentInput(prev => ({
                        ...prev,
                        goals: prev.goals.filter((_, i) => i !== index)
                      }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Enter a goal"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => {
                      if (newGoal.trim()) {
                        setParentInput(prev => ({
                          ...prev,
                          goals: [...prev.goals, newGoal.trim()]
                        }));
                        setNewGoal('');
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Additional Notes (Optional)
              </label>
              <p className="text-gray-600 text-sm mb-2">
                Share any other information that might help us better understand your child's unique needs and personality.
              </p>
              <textarea
                id="notes"
                value={parentInput.notes}
                onChange={(e) => setParentInput(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Any additional information about your child's development..."
              />
            </div>

            <div className="flex flex-col space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">About the Development Assessment</h3>
                <p className="text-sm text-gray-600 mb-2">
                  The development assessment helps us understand your child's current skills across different developmental domains:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 mb-2 space-y-1">
                  <li>Practical Life - Self-care, independence, and fine motor coordination</li>
                  <li>Sensorial - Refinement of senses and understanding the environment</li>
                  <li>Language - Communication, vocabulary, and literacy skills</li>
                  <li>Mathematics - Understanding numbers, quantities, and mathematical concepts</li>
                  <li>Cultural - Exploring geography, science, art, and music</li>
                  <li>Social & Emotional - Self-awareness, emotional regulation, and social skills</li>
                </ul>
                <p className="text-sm text-gray-600">
                  This information will help us create a personalized plan to support your child's growth and development across all domains.
                </p>
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleStartAssessment}
                  disabled={!birthDate || !name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Development Assessment
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !birthDate || !name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {childId ? 'Update Child Profile' : 'Save Child Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}