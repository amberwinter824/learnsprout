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
import { query, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Interest {
  value: string;
  label: string;
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
  const [notes, setNotes] = useState('');
  
  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [birthdateError, setBirthdateError] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

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
        notes: notes.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await createChild(currentUser.uid, childData);
      
      // Redirect to settings page after adding a child
      router.push('/dashboard/settings?setup=complete');
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

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a Child</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <input
                type="date"
                id="birthDate"
                value={formatDateForInput(birthDate)}
                onChange={handleBirthDateChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
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
                Interests
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableInterests.map((interest) => (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => toggleInterest(interest.value)}
                    className={`p-2 rounded-md text-sm ${
                      selectedInterests.includes(interest.value)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {interest.label}
                  </button>
                ))}
              </div>
            </div>

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

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Child'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
}