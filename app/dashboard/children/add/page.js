"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createChild } from '@/lib/dataService';
import { ArrowLeft } from 'lucide-react';

export default function AddChildPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [childData, setChildData] = useState({
    name: '',
    birthDate: '',
    ageGroup: '',
    interests: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ageGroupOptions = [
    { value: '3-4', label: '3-4 years' },
    { value: '4-5', label: '4-5 years' },
    { value: '5-6', label: '5-6 years' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setChildData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser?.uid) {
      setError('You must be logged in to add a child');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Format interests as an array if provided
      const formattedInterests = childData.interests
        ? childData.interests.split(',').map(interest => interest.trim())
        : [];
      
      // Create a Date object from the birthDate string
      const birthDateObj = new Date(childData.birthDate);

      // Create the child in Firestore
      const childId = await createChild(currentUser.uid, {
        name: childData.name,
        birthDate: birthDateObj,
        ageGroup: childData.ageGroup,
        interests: formattedInterests,
        notes: childData.notes,
        active: true
      });
      
      router.push(`/dashboard/children/${childId}`);
    } catch (error) {
      setError('Failed to add child: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/children" className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Children
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Add a Child</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-md">
          {error}
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
                href="/dashboard/children"
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Child'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}