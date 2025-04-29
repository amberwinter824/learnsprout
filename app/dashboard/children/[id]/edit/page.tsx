'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Calendar, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getChild, updateChild } from '@/lib/dataService';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, query, where, Timestamp } from 'firebase/firestore';
import DevelopmentAssessment from '@/components/DevelopmentAssessment';
import DevelopmentPlan from '@/components/DevelopmentPlan';
import { 
  calculateAgeGroup, 
  getAgeGroupDescription, 
  formatAge, 
  isValidBirthdate,
  getAgeAppropriateInterests 
} from '@/lib/ageUtils';

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

export default function EditChildPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  // Form state
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [ageGroup, setAgeGroup] = useState('');
  const [formattedAge, setFormattedAge] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [availableInterests, setAvailableInterests] = useState<{ value: string; label: string; }[]>([]);
  const [parentInput, setParentInput] = useState<ParentInput>({
    concerns: [],
    goals: [],
    notes: ''
  });
  const [newConcern, setNewConcern] = useState('');
  const [newGoal, setNewGoal] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [birthdateError, setBirthdateError] = useState('');
  const [showAssessment, setShowAssessment] = useState(false);
  const [showDevelopmentPlan, setShowDevelopmentPlan] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const fetchChildData = async () => {
      try {
        const childDoc = await getChild(params.id);
        if (!childDoc) {
          setError('Child not found');
          return;
        }

        // Format birthDate for input field and calculations
        let birthDateObj = null;
        if (childDoc.birthDateString) {
          birthDateObj = new Date(childDoc.birthDateString + 'T12:00:00');
        } else if (childDoc.birthDate) {
          birthDateObj = childDoc.birthDate instanceof Date 
            ? childDoc.birthDate 
            : new Date((childDoc.birthDate as Timestamp).seconds * 1000);
        }

        setName(childDoc.name || '');
        setBirthDate(birthDateObj);
        setSelectedInterests(childDoc.interests || []);
        setParentInput(childDoc.parentInput || { concerns: [], goals: [], notes: '' });

        if (birthDateObj) {
          const group = calculateAgeGroup(birthDateObj);
          setAgeGroup(group);
          setFormattedAge(formatAge(birthDateObj));
          setAvailableInterests(getAgeAppropriateInterests(group));
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching child data:', err);
        setError('Failed to load child data');
        setLoading(false);
      }
    };

    fetchChildData();
  }, [currentUser, params.id, router]);

  useEffect(() => {
    if (birthDate) {
      try {
        if (!isValidBirthdate(birthDate)) {
          if (birthDate > new Date()) {
            setBirthdateError('Birth date cannot be in the future');
          } else {
            setBirthdateError('This platform is designed for children up to 7 years old');
          }
          return;
        }
        
        setBirthdateError('');
        const calculatedAgeGroup = calculateAgeGroup(birthDate);
        setAgeGroup(calculatedAgeGroup);
        setFormattedAge(formatAge(birthDate));
        
        const interestOptions = getAgeAppropriateInterests(calculatedAgeGroup);
        setAvailableInterests(interestOptions);
        
        const validInterestValues = interestOptions.map(option => option.value);
        setSelectedInterests(prevInterests => 
          prevInterests.filter(interest => validInterestValues.includes(interest))
        );
      } catch (err) {
        console.error('Error processing birthdate:', err);
        setBirthdateError('Invalid birth date format');
      }
    }
  }, [birthDate]);

  const handleStartAssessment = () => {
    if (!birthDate) {
      setError('Birth date is required for the assessment');
      return;
    }
    if (birthdateError) {
      setError(birthdateError);
      return;
    }
    setShowAssessment(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    
    if (!birthDate) {
      setError('Please enter a birth date');
      return;
    }
    
    if (birthdateError) {
      setError(birthdateError);
      return;
    }
    
    try {
      setError('');
      setSubmitting(true);
      
      await updateChild(params.id, {
        name: name.trim(),
        birthDateString: birthDate.toISOString().split('T')[0],
        birthDate: Timestamp.fromDate(birthDate),
        ageGroup,
        interests: selectedInterests,
        parentInput,
        updatedAt: Timestamp.fromDate(new Date())
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/children/${params.id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating child:', err);
      setError(err.message || 'Failed to update child profile');
    } finally {
      setSubmitting(false);
    }
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
      const batch = writeBatch(db);
      
      // Delete existing skills
      const existingSkills = await getDocs(
        query(collection(db, 'childSkills'), where('childId', '==', params.id))
      );
      existingSkills.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Add new skills
      results.forEach(result => {
        const skillRef = doc(collection(db, 'childSkills'));
        batch.set(skillRef, {
          childId: params.id,
          skillId: result.skillId,
          status: result.status,
          lastAssessed: new Date(),
          notes: result.notes || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      setAssessmentResults(results);
      setShowAssessment(false);
      setShowDevelopmentPlan(true);
    } catch (err) {
      console.error('Error saving assessment results:', err);
      setError('Failed to save assessment results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (showAssessment) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setShowAssessment(false)}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Profile
            </button>
          </div>

          <DevelopmentAssessment
            childName={name}
            birthDate={birthDate!}
            parentInput={parentInput}
            onComplete={handleAssessmentComplete}
          />
        </div>
      </div>
    );
  }

  if (showDevelopmentPlan) {
    return (
      <DevelopmentPlan
        childName={name}
        assessmentResults={assessmentResults}
        parentInput={parentInput}
        onBack={() => setShowDevelopmentPlan(false)}
        onGenerateWeeklyPlan={(plan) => {
          // Handle weekly plan generation
          router.push(`/dashboard/children/${params.id}/weekly-plan`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href={`/dashboard/children/${params.id}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Profile
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Edit {name}'s Profile
          </h1>

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

          {success && (
            <div className="mb-4 p-4 bg-green-50 rounded-md">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-700">Profile updated successfully!</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Name field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            {/* Birth date field */}
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                Birth Date
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="birthDate"
                  value={birthDate ? birthDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setBirthDate(e.target.value ? new Date(e.target.value) : null)}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              {birthdateError && (
                <p className="mt-2 text-sm text-red-600">{birthdateError}</p>
              )}
              {formattedAge && (
                <p className="mt-2 text-sm text-gray-600">
                  Age: {formattedAge} ({getAgeGroupDescription(ageGroup)})
                </p>
              )}
            </div>

            {/* Interests section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableInterests.map(interest => (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => toggleInterest(interest.value)}
                    className={`p-3 text-sm rounded-md border ${
                      selectedInterests.includes(interest.value)
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {interest.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parent Input section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Parent Input</h3>
              
              {/* Concerns */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Concerns
                </label>
                <div className="mt-2 space-y-2">
                  {parentInput.concerns.map((concern, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-grow p-2 bg-gray-50 rounded-md text-sm">
                        {concern}
                      </span>
                      <button
                        type="button"
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
                      placeholder="Add a concern"
                      className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newConcern.trim()) {
                          setParentInput(prev => ({
                            ...prev,
                            concerns: [...prev.concerns, newConcern.trim()]
                          }));
                          setNewConcern('');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Goals
                </label>
                <div className="mt-2 space-y-2">
                  {parentInput.goals.map((goal, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-grow p-2 bg-gray-50 rounded-md text-sm">
                        {goal}
                      </span>
                      <button
                        type="button"
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
                      placeholder="Add a goal"
                      className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newGoal.trim()) {
                          setParentInput(prev => ({
                            ...prev,
                            goals: [...prev.goals, newGoal.trim()]
                          }));
                          setNewGoal('');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  value={parentInput.notes}
                  onChange={(e) => setParentInput(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Development Assessment section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Development Assessment</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Update your child's development assessment to track their progress
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartAssessment}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Start Assessment
                </button>
              </div>
            </div>

            {/* Save button */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 