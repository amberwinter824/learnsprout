"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChild, updateChild } from '@/lib/dataService';
import { ArrowLeft } from 'lucide-react';

export default function EditChildPage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [childData, setChildData] = useState({
    name: '',
    birthDate: '',
    ageGroup: '',
    interests: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const ageGroupOptions = [
    { value: '3-4', label: '3-4 years' },
    { value: '4-5', label: '4-5 years' },
    { value: '5-6', label: '5-6 years' }
  ];

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
        
        // Format birthDate for input field
        let formattedBirthDate = '';
        if (childDoc.birthDate) {
          const date = new Date(childDoc.birthDate.seconds * 1000);
          formattedBirthDate = date.toISOString().split('T')[0];
        }
        
        // Format interests array to comma-separated string
        const interestsString = childDoc.interests ? childDoc.interests.join(', ') : '';
        
        setChildData({
          name: childDoc.name || '',
          birthDate: formattedBirthDate,
          ageGroup: childDoc.ageGroup || '',
          interests: interestsString,
          notes: childDoc.notes || ''
        });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setChildData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSubmitting(true);
      
      // Format interests as an array if provided
      const formattedInterests = childData.interests
        ? childData.interests.split(',').map(interest => interest.trim())
        : [];
      
      // Create a Date object from the birthDate string
      const birthDateObj = childData.birthDate ? new Date(childData.birthDate) : null;

      // Update the child in Firestore
      await updateChild(id, {
        name: childData.name,
        birthDate: birthDateObj,
        ageGroup: childData.ageGroup,
        interests: formattedInterests,
        notes: childData.notes,
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
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
        <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 text-green-700 p-4 rounded-md">
          Child profile updated successfully! Redirecting...
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Child's Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={childData.name}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                Birth Date
              </label>
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                required
                value={childData.birthDate}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700">
                Age Group
              </label>
              <select
                id="ageGroup"
                name="ageGroup"
                required
                value={childData.ageGroup}
                onChange={handleChange}
                className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              >
                <option value="">Select an age group</option>
                {ageGroupOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="interests" className="block text-sm font-medium text-gray-700">
                Interests (comma separated)
              </label>
              <input
                type="text"
                id="interests"
                name="interests"
                placeholder="art, nature, music, etc."
                value={childData.interests}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={childData.notes}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                disabled={submitting}
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