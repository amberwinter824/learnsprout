"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserChildren, ChildData } from '@/lib/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, User, RefreshCw } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

// Define a type for the debug information
interface DebugInfo {
  fetchStart?: string;
  fetchEnd?: string;
  userInfo?: {
    uid: string;
  };
  dataSource?: 'mock' | 'firestore';
  dataReceived?: boolean;
  childrenCount?: number;
  error?: string;
  errorDetails?: {
    message?: string;
    stack?: string;
    time: string;
  };
  timeoutTriggered?: boolean;
  timeoutTime?: string;
  retryAttempt?: number;
  retryTime?: string;
  [key: string]: any;
}

// Mock data to bypass Firestore fetch if needed
const mockChildren: ChildData[] = [
  {
    id: "mock1",
    name: "Sophie",
    birthDate: Timestamp.fromDate(new Date("2020-01-15")),
    ageGroup: "3-4",
    active: true,
    userId: "mock-user-id",
    interests: ["art", "nature", "music"]
  },
  {
    id: "mock2",
    name: "Ethan",
    birthDate: Timestamp.fromDate(new Date("2021-06-10")),
    ageGroup: "1-2",
    active: true,
    userId: "mock-user-id",
    interests: ["building", "sensory"]
  }
];

export default function ChildrenListPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [useMockData, setUseMockData] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});

  useEffect(() => {
    async function fetchChildren() {
      if (!currentUser) {
        console.log("No user found, cannot fetch children");
        setDebugInfo(prev => ({
          ...prev,
          error: "No user found, cannot fetch children"
        }));
        setLoading(false);
        return;
      }

      try {
        setDebugInfo(prev => ({
          ...prev, 
          fetchStart: new Date().toISOString(),
          userInfo: { uid: currentUser.uid }
        }));
        
        if (useMockData) {
          console.log("Using mock data");
          setChildren(mockChildren);
          setDebugInfo(prev => ({
            ...prev,
            dataSource: "mock",
            fetchEnd: new Date().toISOString()
          }));
        } else {
          console.log("Fetching real children data for user:", currentUser.uid);
          const childrenData = await getUserChildren(currentUser.uid);
          console.log("Children data received:", childrenData);
          setChildren(childrenData || []);
          setDebugInfo(prev => ({
            ...prev,
            dataSource: "firestore",
            fetchEnd: new Date().toISOString(),
            dataReceived: !!childrenData,
            childrenCount: childrenData?.length || 0
          }));
        }
        
        setError('');
      } catch (err: any) {
        console.error('Error fetching children:', err);
        setError(`Failed to load children profiles: ${err.message || 'Unknown error'}`);
        setDebugInfo(prev => ({
          ...prev,
          errorDetails: {
            message: err.message,
            stack: err.stack,
            time: new Date().toISOString()
          }
        }));
      } finally {
        setLoading(false);
      }
    }

    // Set a timeout to prevent infinite loading state
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("Loading timeout triggered");
        setLoading(false);
        setError("Loading timeout - operation took too long");
        setDebugInfo(prev => ({
          ...prev,
          timeoutTriggered: true,
          timeoutTime: new Date().toISOString()
        }));
      }
    }, 10000); // 10 second timeout

    fetchChildren();

    return () => clearTimeout(timeout);
  }, [currentUser, useMockData]);

  const handleAddChild = (): void => {
    router.push('/dashboard/children/new');
  };

  const toggleMockData = (): void => {
    setUseMockData(!useMockData);
    setLoading(true);
  };

  const retryFetch = (): void => {
    setLoading(true);
    setDebugInfo(prev => ({
      ...prev,
      retryAttempt: (prev.retryAttempt || 0) + 1,
      retryTime: new Date().toISOString()
    }));
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
        <button 
          onClick={() => setLoading(false)}
          className="mt-6 text-sm text-emerald-600 hover:text-emerald-700"
        >
          Cancel loading
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Children</h1>
        <div className="flex space-x-2">
          <button
            onClick={toggleMockData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            {useMockData ? 'Using Mock Data' : 'Using Real Data'}
          </button>
          <button
            onClick={retryFetch}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleAddChild}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
            Add Child
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          <div className="font-medium">Error loading children</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {/* Debug Info */}
      <div className="mb-6 bg-yellow-50 p-4 rounded-md">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-yellow-800">Debug Information</h3>
          <button 
            onClick={() => setDebugInfo({})}
            className="text-xs text-yellow-600 hover:text-yellow-800"
          >
            Clear
          </button>
        </div>
        <pre className="mt-2 text-xs overflow-auto max-h-40 bg-yellow-100 p-2 rounded">
          {JSON.stringify({
            time: new Date().toISOString(),
            useMockData,
            userAuthenticated: !!currentUser,
            userId: currentUser?.uid,
            childrenCount: children.length,
            childrenIds: children.map(c => c.id),
            ...debugInfo
          }, null, 2)}
        </pre>
      </div>

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