"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChild, deleteChild } from '@/lib/dataService';
import { ArrowLeft, Edit2, Trash2, Calendar, Tag, Heart, FileText } from 'lucide-react';
import { formatAge, getAgeGroupDescription } from '@/lib/ageUtils';

// This should be a separate page, like app/dashboard/children/[id]/page.js
export default function ChildProfilePage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchChild() {
      if (!id) {
        console.error("No child ID provided");
        setError('Child ID is required');
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching child with ID:", id);
        setError('');
        const childDoc = await getChild(id);
        
        if (!childDoc) {
          console.error("Child not found with ID:", id);
          setError('Child not found');
          setLoading(false);
          return;
        }
        
        console.log("Child data received:", childDoc);
        setChild(childDoc);
      } catch (err) {
        console.error('Error fetching child:', err);
        setError('Failed to load child information');
      } finally {
        setLoading(false);
      }
    }

    fetchChild();
  }, [id]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteChild(id);
      router.push('/dashboard/children');
    } catch (err) {
      console.error('Error deleting child:', err);
      setError('Failed to delete child');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Format birthdate for display
  const formatBirthDate = (timestamp) => {
    if (!timestamp) return 'Not set';
    
    // Handle both Date objects and Firestore Timestamps
    const date = timestamp.seconds 
      ? new Date(timestamp.seconds * 1000) 
      : new Date(timestamp);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading child profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/dashboard/children" className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Children
          </Link>
        </div>
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/dashboard/children" className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Children
          </Link>
        </div>
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md">
          Child profile not found.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <Link href="/dashboard/children" className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Children
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{child.name}'s Profile</h1>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/dashboard/children/${id}/edit`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Edit2 className="-ml-0.5 mr-2 h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash2 className="-ml-0.5 mr-2 h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-emerald-50 border-b border-emerald-100">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Child Information
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Personal details and preferences
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                Birth Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatBirthDate(child.birthDate)}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Tag className="h-4 w-4 mr-1.5 text-gray-400" />
                Age
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {child.birthDate ? formatAge(child.birthDate) : 'Not set'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Tag className="h-4 w-4 mr-1.5 text-gray-400" />
                Age Group
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {child.ageGroup ? getAgeGroupDescription(child.ageGroup) : 'Not set'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Heart className="h-4 w-4 mr-1.5 text-gray-400" />
                Interests
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {child.interests && child.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {child.interests.map(interest => (
                      <span key={interest} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  'No interests specified'
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <FileText className="h-4 w-4 mr-1.5 text-gray-400" />
                Notes
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {child.notes || 'No additional notes'}
              </dd>
            </div>
          </dl>
        </div>
        <div className="border-t border-gray-200 px-4 py-4 sm:px-6 bg-gray-50">
          <div className="flex space-x-3 justify-end">
            <Link
              href={`/dashboard/activities?childId=${id}`}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              View Activities
            </Link>
            <Link
              href={`/dashboard/children/${id}/progress`}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Track Progress
            </Link>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Child Profile
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete {child.name}'s profile? This action cannot be undone, and all associated data will be permanently removed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}