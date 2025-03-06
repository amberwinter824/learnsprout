"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserChildren, ChildData } from '@/lib/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, User } from 'lucide-react';

export default function ChildrenListPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    let timeoutId: NodeJS.Timeout;

    async function fetchChildren() {
      if (!currentUser) {
        console.log("No user found, cannot fetch children");
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        console.log("Fetching children for user:", currentUser.uid);
        const childrenData = await getUserChildren(currentUser.uid);
        console.log("Children data received:", childrenData);
        
        if (isMounted) {
          setChildren(childrenData || []);
          setLoading(false);
          setError('');
        }
      } catch (err: any) {
        console.error('Error fetching children:', err);
        if (isMounted) {
          setError(`Failed to load children profiles: ${err.message || 'Unknown error'}`);
          setLoading(false);
        }
      }
    }

    // Set a timeout to prevent infinite loading state
    timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.log("Loading timeout triggered");
        setLoading(false);
        setError("Loading timeout - operation took too long");
      }
    }, 10000); // 10 second timeout

    // Only fetch if we're in loading state
    if (loading) {
      fetchChildren();
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [currentUser, loading]);

  const handleAddChild = (): void => {
    router.push('/dashboard/children/add');
  };

  // Format birthdate for display
  const formatBirthDate = (timestamp: any): string => {
    if (!timestamp) return 'Not set';
    
    try {
      // Handle both Date objects and Firestore Timestamps
      const date = timestamp.seconds 
        ? new Date(timestamp.seconds * 1000) 
        : new Date(timestamp);
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting birthdate:", error, timestamp);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading children profiles...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Children</h1>
        <button
          onClick={handleAddChild}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
          Add Child
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          <div className="font-medium">Error loading children</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {children.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No children profiles</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first child profile
          </p>
          <div className="mt-6">
            <button
              onClick={handleAddChild}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
              Add Child
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/children/${child.id}`)}
            >
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-emerald-100 rounded-full p-3">
                    <User className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">
                      {child.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {child.birthDate ? formatBirthDate(child.birthDate) : 'Birth date not set'}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  {child.ageGroup && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      {child.ageGroup}
                    </span>
                  )}
                  {child.active !== undefined && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      child.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {child.active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link
                    href={`/dashboard/children/${child.id}`}
                    className="font-medium text-emerald-600 hover:text-emerald-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View profile
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}