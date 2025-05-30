"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChild, updateChild } from '@/lib/dataService';
import { ArrowLeft, AlertCircle, Calendar, CheckCircle } from 'lucide-react';
import { 
  calculateAgeGroup, 
  getAgeGroupDescription, 
  formatAge, 
  isValidBirthdate,
  getAgeAppropriateInterests,
  getAllAgeGroups
} from '@/lib/ageUtils';

export default function EditChildPage({ params }) {
  const router = useRouter();
  const { id } = params;
  
  // Form state
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState(null);
  const [ageGroup, setAgeGroup] = useState('');
  const [formattedAge, setFormattedAge] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [notes, setNotes] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [birthdateError, setBirthdateError] = useState('');

  // Effect to fetch child data
  useEffect(() => {
    async function fetchChild() {
      try {
        setError('');
        const childDoc = await getChild(id);
        
        if (!childDoc) {
          setError('Child not found');
          setLoading(false);
          return;
        }
        
        // Format birthDate for input field and calculations
        let birthDateObj = null;
        if (childDoc.birthDateString) {
          // Handle birthDateString format (YYYY-MM-DD)
          birthDateObj = new Date(childDoc.birthDateString + 'T12:00:00');
        } else if (childDoc.birthDate) {
          // Handle legacy birthDate format (Timestamp or Date)
          birthDateObj = childDoc.birthDate.seconds 
            ? new Date(childDoc.birthDate.seconds * 1000) 
            : new Date(childDoc.birthDate);
        }
        
        // Set form state
        setName(childDoc.name || '');
        setBirthDate(birthDateObj);
        setSelectedInterests(childDoc.interests || []);
        setNotes(childDoc.notes || '');
        
        // Let the useEffect for birthDate calculate the age group
      } catch (err) {
        console.error('Error fetching child:', err);
        setError('Failed to load child information: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchChild();
    }
  }, [id]);

  // Effect to calculate age group when birthdate changes
  useEffect(() => {
    if (birthDate) {
      try {
        // Validate birthdate
        if (!isValidBirthdate(birthDate)) {
          if (birthDate > new Date()) {
            setBirthdateError('Birth date cannot be in the future');
          } else {
            setBirthdateError('This platform is designed for children up to 7 years old');
          }
          return;
        }
        
        // Clear any previous errors
        setBirthdateError('');
        
        // Calculate and set age group
        const calculatedAgeGroup = calculateAgeGroup(birthDate);
        setAgeGroup(calculatedAgeGroup);
        
        // Format age for display
        setFormattedAge(formatAge(birthDate));
        
        // Get age-appropriate interests
        const interestOptions = getAgeAppropriateInterests(calculatedAgeGroup);
        setAvailableInterests(interestOptions);
        
        // Filter out any interests that are no longer valid for the age group
        const validInterestValues = interestOptions.map(option => option.value);
        setSelectedInterests(prevInterests => 
          prevInterests.filter(interest => 
            validInterestValues.includes(interest)
          )
        );
      } catch (err) {
        console.error('Error processing birthdate:', err);
        setBirthdateError('Invalid birth date format');
      }
    } else {
      setAgeGroup('');
      setFormattedAge('');
      setBirthdateError('');
      setAvailableInterests(getAgeAppropriateInterests());
    }
  }, [birthDate]);

  // Handle birthdate change
  const handleBirthDateChange = (e) => {
    const dateValue = e.target.value;
    if (!dateValue) {
      setBirthDate(null);
      return;
    }
    
    const inputDate = new Date(dateValue);
    if (isNaN(inputDate.getTime())) {
      setBirthdateError('Invalid date format');
      return;
    }
    
    setBirthDate(inputDate);
  };

  // Toggle interest selection
  const toggleInterest = (interestValue) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestValue)) {
        return prev.filter(i => i !== interestValue);
      } else {
        return [...prev, interestValue];
      }
    });
  };

  const handleSubmit = async (e) => {
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
      
      // Update the child in Firestore
      await updateChild(id, {
        name: name.trim(),
        birthDateString: birthDate.toISOString().split('T')[0], // Store as YYYY-MM-DD string
        ageGroup, // Automatically calculated based on birthDate
        interests: selectedInterests,
        notes: notes.trim(),
        // Keep active status as is
      });
      
      setSuccess(true);
      
      // Navigate back to child profile after a short delay
      setTimeout(() => {
        router.push(`/dashboard/children/${id}`);
      }, 1500);
    } catch (error) {
      console.error("Error updating child:", error);
      setError('Failed to update child: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate maximum allowed birthdate (today)
  const maxDate = new Date().toISOString().split('T')[0];
  
  // Calculate minimum allowed birthdate (7 years ago)
  const minDate = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 7);
    return date.toISOString().split('T')[0];
  })();
  
  // Format date for input field
  const formatDateForInput = (date) => {
    if (!date) return '';
    
    // Handle both Date objects and Firestore Timestamps
    const dateObj = date instanceof Date ? date : date.toDate();
    
    // Format as YYYY-MM-DD for input[type="date"]
    return dateObj.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/children/${id}`} className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Child Profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Child Profile</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 text-green-700 p-4 rounded-md flex items-start">
          <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>Child profile updated successfully! Redirecting...</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Child Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Child's Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm px-3 py-2"
              />
            </div>

            {/* Birth Date */}
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                Birth Date
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  required
                  value={formatDateForInput(birthDate)}
                  onChange={handleBirthDateChange}
                  max={maxDate}
                  min={minDate}
                  className={`block w-full border ${birthdateError ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm`}
                />
              </div>
              {birthdateError && (
                <p className="mt-1 text-sm text-red-600">{birthdateError}</p>
              )}
              {formattedAge && !birthdateError && (
                <p className="mt-1 text-sm text-gray-500">Age: {formattedAge}</p>
              )}
            </div>

            {/* Age Group (Calculated Automatically) */}
            {ageGroup && !birthdateError && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Age Group (Auto-calculated)
                </label>
                <div className="mt-1 block w-full bg-gray-50 border border-gray-200 rounded-md py-2 px-3 text-gray-700 sm:text-sm">
                  {getAgeGroupDescription(ageGroup)}
                </div>
                <p className="mt-1 text-xs text-gray-500 italic">
                  Age group is now automatically calculated based on birth date
                </p>
              </div>
            )}

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select all that apply. These help us suggest appropriate activities.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableInterests.map((option) => (
                  <label 
                    key={option.value} 
                    className={`
                      inline-flex items-center px-3 py-2 rounded border 
                      ${selectedInterests.includes(option.value) 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}
                      cursor-pointer text-sm transition-colors
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInterests.includes(option.value)}
                      onChange={() => toggleInterest(option.value)}
                      className="sr-only"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {availableInterests.length === 0 && (
                <p className="text-gray-500 italic text-sm">
                  Please select a birth date to see age-appropriate interests
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm px-3 py-2"
                placeholder="Any additional information about your child..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href={`/dashboard/children/${id}`}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !!birthdateError}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}