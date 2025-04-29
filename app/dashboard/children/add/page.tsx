"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createChild } from '@/lib/dataService';
import { ArrowLeft, AlertCircle, Calendar } from 'lucide-react';
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
import { query, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Interest {
  value: string;
  label: string;
}

interface ParentInput {
  concerns: string[];
  goals: string[];
  notes: string;
}

interface DevelopmentalSkill {
  id: string;
  name: string;
  description: string;
  area: string;
  ageGroups: string[];
  category: string;
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

  const handleAssessmentComplete = (results: AssessmentResult[]) => {
    setAssessmentResults(results);
    setStep('development-plan');
  };

  const handleGenerateWeeklyPlan = (plan: DevelopmentPlan) => {
    // Store the plan in state for later use
    setDevelopmentPlan(plan);
    setShowDevelopmentPlan(false);
    // Continue with child creation
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleStartAssessment = () => {
    if (!birthDate) {
      setBirthdateError('Please enter a birth date before starting the assessment');
      return;
    }
    if (!name.trim()) {
      setError('Please enter a name before starting the assessment');
      return;
    }
    setShowAssessment(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!currentUser) {
        throw new Error('You must be logged in to add a child');
      }

      if (!name.trim()) {
        throw new Error('Please enter a name');
      }

      if (!birthDate) {
        throw new Error('Please enter a birth date');
      }

      if (!isValidBirthdate(birthDate)) {
        throw new Error('Please enter a valid birth date');
      }

      const childData = {
        name: name.trim(),
        birthDate,
        ageGroup,
        interests: selectedInterests,
        parentInput,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const childId = await createChild(currentUser.uid, childData);
      
      // Create child skills records from assessment results if they exist
      if (assessmentResults.length > 0) {
        const batch = writeBatch(db);
        
        assessmentResults.forEach(result => {
          const skillRef = doc(collection(db, 'childSkills'));
          batch.set(skillRef, {
            childId,
            skillId: result.skillId,
            status: result.status,
            lastAssessed: new Date(),
            notes: result.notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
        
        await batch.commit();
      }
      
      // Redirect to dashboard after adding a child
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error adding child:', err);
      setError(err.message || 'Failed to add child');
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

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        {showAssessment ? (
          <DevelopmentAssessment
            childName={name}
            birthDate={birthDate!}
            parentInput={parentInput}
            onComplete={handleAssessmentComplete}
          />
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a Child</h1>
            
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* Name Input */}
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
                />
              </div>

              {/* Birth Date Input */}
              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                  Birth Date
                </label>
                <input
                  type="date"
                  id="birthDate"
                  onChange={handleBirthDateChange}
                  max={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
                {birthdateError && (
                  <p className="mt-2 text-sm text-red-600">{birthdateError}</p>
                )}
                {formattedAge && (
                  <p className="mt-2 text-sm text-gray-600">
                    Age: {formattedAge} ({getAgeGroupDescription(ageGroup)})
                  </p>
                )}
              </div>

              {/* Interests Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interests
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableInterests.map((interest) => (
                    <button
                      key={interest.value}
                      type="button"
                      onClick={() => toggleInterest(interest.value)}
                      className={`p-2 text-sm rounded-md ${
                        selectedInterests.includes(interest.value)
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {interest.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleStartAssessment}
                  className="inline-flex items-center px-4 py-2 border border-emerald-300 text-sm font-medium rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Complete Development Assessment
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Save Child
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}