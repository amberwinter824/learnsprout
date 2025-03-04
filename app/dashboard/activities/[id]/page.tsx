"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getActivity, getUserChildren } from '@/lib/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Layers, 
  CheckCircle, 
  Calendar,
  BookOpen,
  Clipboard,
  ChevronRight
} from 'lucide-react';

interface ActivityProps {
  params: {
    id: string;
  };
}

interface Child {
  id: string;
  name: string;
  birthDate?: any;
  ageGroup?: string;
  interests?: string[];
  notes?: string;
}

interface Activity {
  id?: string;
  title: string;
  description?: string;
  instructions?: string;
  ageRanges?: string[];
  area?: string;
  materialsNeeded?: string[];
  duration?: number;
  difficulty?: string;
  status?: string;
  imageUrl?: string;
  prerequisites?: string[];
  nextSteps?: string[];
  relatedActivities?: string[];
  skillsAddressed?: string[];
}

export default function ActivityDetailPage({ params }: ActivityProps) {
  const router = useRouter();
  const { id } = params;
  const { currentUser } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch activity details
        const activityData = await getActivity(id);
        if (!activityData) {
          setError('Activity not found');
          setLoading(false);
          return;
        }
        // Ensure activityData has all required Activity properties
        if (!('title' in activityData)) {
          throw new Error('Invalid activity data received');
        }
        setActivity(activityData as Activity);
        
        // Fetch user's children for the "Add to Weekly Plan" and "Record Observation" features
        if (currentUser?.uid) {
          const childrenData = await getUserChildren(currentUser.uid);
          // Ensure each child has the required properties
          const validatedChildren = childrenData.map(child => {
            if (!('name' in child)) {
              throw new Error('Invalid child data received');
            }
            return child as Child;
          });
          setChildren(validatedChildren);
        }
      } catch (error: any) {
        console.error('Error fetching activity:', error);
        setError('Failed to load activity: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, currentUser]);

  // Format area name for display
  const formatAreaName = (area?: string): string => {
    if (!area) return '';
    return area
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get area color for visual distinction
  const getAreaColor = (area?: string): string => {
    if (!area) return 'bg-gray-100 text-gray-800';
    
    switch(area) {
      case 'practical_life': return 'bg-blue-100 text-blue-800';
      case 'sensorial': return 'bg-purple-100 text-purple-800';
      case 'language': return 'bg-green-100 text-green-800';
      case 'mathematics': return 'bg-red-100 text-red-800';
      case 'cultural': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format difficulty level
  const formatDifficulty = (difficulty?: string): string => {
    if (!difficulty) return '';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  // Navigate to weekly plan page with this activity pre-selected
  const addToWeeklyPlan = (): void => {
    if (selectedChildId) {
      router.push(`/dashboard/children/${selectedChildId}/weekly-plan?activityId=${id}`);
    }
  };

  // Navigate to progress tracking page with this activity pre-selected
  const recordObservation = (): void => {
    if (selectedChildId) {
      router.push(`/dashboard/children/${selectedChildId}/progress?activityId=${id}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading activity details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>{error}</p>
        <Link href="/dashboard/activities" className="mt-4 inline-block text-red-700 underline">
          Back to Activities
        </Link>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>Activity not found</p>
        <Link href="/dashboard/activities" className="mt-4 inline-block text-red-700 underline">
          Back to Activities
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/activities" className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Activities
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{activity.title}</h1>
        <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAreaColor(activity.area)}`}>
          {formatAreaName(activity.area)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main activity details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Activity Details</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {activity.description && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                  <p className="text-gray-700">{activity.description}</p>
                </div>
              )}
              
              {activity.instructions && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Instructions</h4>
                  <p className="text-gray-700 whitespace-pre-line">{activity.instructions}</p>
                </div>
              )}
              
              {activity.materialsNeeded && activity.materialsNeeded.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Materials Needed</h4>
                  <ul className="list-disc list-inside text-gray-700">
                    {activity.materialsNeeded.map((material, index) => (
                      <li key={index}>{material}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {activity.skillsAddressed && activity.skillsAddressed.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Skills Addressed</h4>
                  <div className="flex flex-wrap gap-2">
                    {activity.skillsAddressed.map((skillId, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {skillId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related activities section (if available) */}
          {((activity.prerequisites && activity.prerequisites.length > 0) || 
            (activity.nextSteps && activity.nextSteps.length > 0) || 
            (activity.relatedActivities && activity.relatedActivities.length > 0)) && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Related Activities</h3>
              </div>
              <div className="px-4 py-5 sm:p-6 space-y-4">
                {activity.prerequisites && activity.prerequisites.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Prerequisites</h4>
                    <div className="space-y-2">
                      {activity.prerequisites.map((actId, index) => (
                        <Link
                          key={index}
                          href={`/dashboard/activities/${actId}`}
                          className="block p-2 border rounded hover:bg-gray-50"
                        >
                          Activity {actId}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {activity.nextSteps && activity.nextSteps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Next Steps</h4>
                    <div className="space-y-2">
                      {activity.nextSteps.map((actId, index) => (
                        <Link
                          key={index}
                          href={`/dashboard/activities/${actId}`}
                          className="block p-2 border rounded hover:bg-gray-50"
                        >
                          Activity {actId}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {activity.relatedActivities && activity.relatedActivities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Related Activities</h4>
                    <div className="space-y-2">
                      {activity.relatedActivities.map((actId, index) => (
                        <Link
                          key={index}
                          href={`/dashboard/activities/${actId}`}
                          className="block p-2 border rounded hover:bg-gray-50"
                        >
                          Activity {actId}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar with summary and actions */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Activity Summary</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="space-y-4">
                {activity.ageRanges && activity.ageRanges.length > 0 && (
                  <div className="flex items-center">
                    <dt className="flex-shrink-0">
                      <Users className="h-5 w-5 text-gray-400" />
                    </dt>
                    <dd className="ml-3 text-sm text-gray-700">
                      <span className="font-medium">Age Range:</span> {activity.ageRanges.join(', ')} years
                    </dd>
                  </div>
                )}
                
                {activity.duration && (
                  <div className="flex items-center">
                    <dt className="flex-shrink-0">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </dt>
                    <dd className="ml-3 text-sm text-gray-700">
                      <span className="font-medium">Duration:</span> {activity.duration} minutes
                    </dd>
                  </div>
                )}
                
                {activity.difficulty && (
                  <div className="flex items-center">
                    <dt className="flex-shrink-0">
                      <Layers className="h-5 w-5 text-gray-400" />
                    </dt>
                    <dd className="ml-3 text-sm text-gray-700">
                      <span className="font-medium">Difficulty:</span> {formatDifficulty(activity.difficulty)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Actions section (if the user has children) */}
          {children.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Actions</h3>
              </div>
              <div className="px-4 py-5 sm:p-6 space-y-4">
                <div>
                  <label htmlFor="childSelect" className="block text-sm font-medium text-gray-700 mb-2">
                    Select a Child
                  </label>
                  <select
                    id="childSelect"
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <option value="">Choose a child</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={addToWeeklyPlan}
                    disabled={!selectedChildId}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Add to Weekly Plan
                  </button>
                  
                  <button
                    onClick={recordObservation}
                    disabled={!selectedChildId}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <Clipboard className="h-4 w-4 mr-2" />
                    Record Observation
                  </button>
                </div>
                
                {selectedChildId && (
                  <div className="mt-4 space-y-2">
                    <Link
                      href={`/dashboard/children/${selectedChildId}/weekly-plan`}
                      className="flex items-center text-sm text-emerald-600 hover:text-emerald-500"
                    >
                      View Weekly Plan
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                    <Link
                      href={`/dashboard/children/${selectedChildId}/progress`}
                      className="flex items-center text-sm text-emerald-600 hover:text-emerald-500"
                    >
                      View Progress Records
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}