// app/dashboard/progress/page.tsx
"use client"
import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserChildren, getChildProgress } from '@/lib/dataService';
import { 
  BarChart2, 
  Users, 
  Book, 
  TrendingUp, 
  Award, 
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  AlertCircle
} from 'lucide-react';

interface ProgressRecord {
  id?: string;
  activityTitle?: string;
  completionStatus: string;
  date: any;
  activityId: string;
  engagementLevel?: string;
  notes?: string;
}

interface ChildData {
  id: string;
  name: string;
  ageGroup?: string;
  birthDate?: any;
  userId: string;
}

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="bg-red-50 p-6 rounded-lg text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h2>
      <p className="text-red-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

export default function ProgressDashboardPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <ProgressDashboardContent />
    </ErrorBoundary>
  );
}

function ProgressDashboardContent() {
  const { currentUser } = useAuth();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [progressData, setProgressData] = useState<Record<string, ProgressRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      console.log("Progress page: Starting data fetch");
      console.log("Current user:", currentUser);
      
      if (currentUser?.uid) {
        try {
          console.log("Fetching children for user:", currentUser.uid);
          // Fetch all children
          const childrenData = await getUserChildren(currentUser.uid);
          
          // Filter out any children without IDs
          const validChildren = childrenData
            .filter((child): child is ChildData => 
              typeof child.id === 'string' && Boolean(child.id) && typeof child.userId === 'string')
            .map(child => ({
              id: child.id,
              name: child.name || 'Unnamed Child',
              userId: child.userId,
              ageGroup: child.ageGroup,
              birthDate: child.birthDate
            }));
          
          setChildren(validChildren);
          console.log("Children data:", validChildren);

          // Fetch progress for each child
          const progressPromises = validChildren.map(async (child) => {
            try {
              console.log("Fetching progress for child:", child.id);
              const progress = await getChildProgress(child.id);
              return { childId: child.id, progress };
            } catch (childError) {
              console.error(`Error fetching progress for child ${child.id}:`, childError);
              return { childId: child.id, progress: [] };
            }
          });

          const progressResults = await Promise.allSettled(progressPromises);
          const progressByChild: Record<string, ProgressRecord[]> = {};
          
          progressResults.forEach((result, index) => {
            const childId = validChildren[index].id;
            if (result.status === 'fulfilled') {
              progressByChild[childId] = result.value.progress || [];
            } else {
              console.error(`Failed to fetch progress for child ${childId}:`, result.reason);
              progressByChild[childId] = [];
            }
          });

          setProgressData(progressByChild);
          console.log("Progress data loaded:", Object.keys(progressByChild).length);
        } catch (error: unknown) {
          console.error('Error fetching data:', error);
          setError('Error fetching data: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
          setLoading(false);
        }
      } else {
        console.log("No user or UID available");
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser]);

  // Helper functions
  const getProgressSummary = (childId: string) => {
    const records = progressData[childId] || [];
    
    const total = records.length;
    const completed = records.filter(r => r.completionStatus === 'completed').length;
    const inProgress = records.filter(r => r.completionStatus === 'in_progress').length;
    const started = records.filter(r => r.completionStatus === 'started').length;
    
    return { total, completed, inProgress, started };
  };

  const getRecentRecords = (childId: string) => {
    const records = progressData[childId] || [];
    return records.slice(0, 3); // Just show 3 most recent
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.seconds 
        ? new Date(timestamp.seconds * 1000) 
        : new Date(timestamp);
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getCompletionStatusLabel = (status: string) => {
    switch(status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'started': return 'Started';
      default: return status;
    }
  };

  const getStatusColorClass = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'started': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Progress Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your children's development and learning journey
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {children.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Children Added</h2>
          <p className="text-gray-600 mb-4">
            Add a child profile to start tracking progress.
          </p>
          <Link
            href="/dashboard/children/add"
            className="inline-block bg-emerald-500 text-white px-4 py-2 rounded-md font-medium hover:bg-emerald-600 transition-colors"
          >
            Add Child Profile
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {children.map(child => {
            const progressSummary = getProgressSummary(child.id);
            const recentRecords = getRecentRecords(child.id);
            
            return (
              <div key={child.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-medium">
                        {child.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{child.name}</h3>
                        <p className="text-sm text-gray-500">{child.ageGroup || 'Age not specified'}</p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <Link
                        href={`/dashboard/children/${child.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/dashboard/children/${child.id}?showAddRecord=true`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Record
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activities Summary */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                        <Book className="h-4 w-4 mr-1 text-emerald-500" />
                        Activities Progress
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xl font-semibold text-gray-900">{progressSummary.total}</p>
                          <p className="text-xs text-gray-500">Total Records</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-xl font-semibold text-green-600">{progressSummary.completed}</p>
                          <p className="text-xs text-gray-500">Completed</p>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded">
                          <p className="text-xl font-semibold text-yellow-600">{progressSummary.inProgress}</p>
                          <p className="text-xs text-gray-500">In Progress</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-xl font-semibold text-blue-600">{progressSummary.started}</p>
                          <p className="text-xs text-gray-500">Started</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Recent Activity */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-emerald-500" />
                        Recent Activity
                      </h4>
                      {recentRecords.length > 0 ? (
                        <div className="space-y-2">
                          {recentRecords.map((record, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="text-sm">
                                <p className="font-medium text-gray-900 line-clamp-1">
                                  {record.activityTitle || 'Activity'}
                                </p>
                                <p className="text-xs text-gray-500">{formatDate(record.date)}</p>
                              </div>
                              <span 
                                className={`
                                  px-2 py-1 text-xs rounded-full 
                                  ${getStatusColorClass(record.completionStatus)}
                                `}
                              >
                                {getCompletionStatusLabel(record.completionStatus)}
                              </span>
                            </div>
                          ))}
                          {progressSummary.total > 3 && (
                            <div className="text-center mt-2">
                              <Link 
                                href={`/dashboard/children/${child.id}`} 
                                className="text-sm text-emerald-600 hover:text-emerald-700"
                              >
                                View all {progressSummary.total} records
                              </Link>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded">
                          <p className="text-sm text-gray-500">No progress records yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}