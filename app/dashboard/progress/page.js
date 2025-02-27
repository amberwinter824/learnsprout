"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserChildren, getChildProgress } from '@/lib/dataService';
import { BarChart2 } from 'lucide-react';

export default function ProgressDashboardPage() {
  const { currentUser } = useAuth();
  const [children, setChildren] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (currentUser?.uid) {
        try {
          // Fetch all children
          const childrenData = await getUserChildren(currentUser.uid);
          setChildren(childrenData);

          // Fetch progress for each child
          const progressPromises = childrenData.map(async (child) => {
            const progress = await getChildProgress(child.id);
            return { childId: child.id, progress };
          });

          const progressResults = await Promise.all(progressPromises);
          const progressByChild = progressResults.reduce((acc, { childId, progress }) => {
            acc[childId] = progress;
            return acc;
          }, {});

          setProgressData(progressByChild);
        } catch (error) {
          setError('Error fetching data: ' + error.message);
        } finally {
          setLoading(false);
        }
      }
    }

    fetchData();
  }, [currentUser]);

  // Helper functions
  const getProgressSummary = (childId) => {
    const records = progressData[childId] || [];
    
    const total = records.length;
    const completed = records.filter(r => r.completionStatus === 'completed').length;
    const inProgress = records.filter(r => r.completionStatus === 'in_progress').length;
    const started = records.filter(r => r.completionStatus === 'started').length;
    
    return { total, completed, inProgress, started };
  };

  const getRecentRecords = (childId) => {
    const records = progressData[childId] || [];
    return records.slice(0, 5);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds 
      ? new Date(timestamp.seconds * 1000) 
      : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
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
          <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
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
        <div className="space-y-6">
          {children.map(child => {
            const summary = getProgressSummary(child.id);
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
                    <Link
                      href={`/dashboard/children/${child.id}/progress`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Progress Summary</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
                          <p className="text-xs text-gray-500">Total Records</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded">
                          <p className="text-2xl font-semibold text-green-600">{summary.completed}</p>
                          <p className="text-xs text-gray-500">Completed</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded">
                          <p className="text-2xl font-semibold text-yellow-600">{summary.inProgress}</p>
                          <p className="text-xs text-gray-500">In Progress</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded">
                          <p className="text-2xl font-semibold text-blue-600">{summary.started}</p>
                          <p className="text-xs text-gray-500">Started</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Recent Activity</h4>
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
                                  ${record.completionStatus === 'completed' ? 'bg-green-100 text-green-800' : 
                                    record.completionStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-blue-100 text-blue-800'}
                                `}
                              >
                                {record.completionStatus === 'completed' ? 'Completed' : 
                                 record.completionStatus === 'in_progress' ? 'In Progress' : 
                                 'Started'}
                              </span>
                            </div>
                          ))}
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