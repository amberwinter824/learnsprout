// app/dashboard/activities/[id]/page.tsx
"use client"
import React from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getActivity, getChild } from '../../../lib/dataService';
import { ActivityObservationForm } from '../../../components/ActivityObservationForm';
import { ArrowLeft, Clock, BarChart2, Target, Book } from 'lucide-react';

// Define TypeScript interfaces
interface ActivityData {
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

interface ChildData {
  id?: string;
  name: string;
  birthDate?: any;
  parentId?: string;
  ageGroup?: string;
  active?: boolean;
  interests?: string[];
  notes?: string;
}

interface PageParams {
  params: {
    id: string;
  }
}

export default function ActivityDetailPage({ params }: PageParams) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('childId');
  
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch the activity
        const activityData = await getActivity(id);
        if (!activityData) {
          setError('Activity not found');
          setLoading(false);
          return;
        }
        setActivity(activityData);
        
        // If a child ID is provided, fetch the child data
        if (childId) {
          const childData = await getChild(childId);
          if (childData) {
            setChild(childData);
          }
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(`Error fetching data: ${err.message}`);
        setLoading(false);
      }
    }
    
    fetchData();
  }, [id, childId]);
  
  // Format area string for display
  const formatArea = (area?: string): string => {
    if (!area) return '';
    return area
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get area color class
  const getAreaColorClass = (area?: string): string => {
    if (!area) return 'bg-gray-100 text-gray-700';
    
    switch(area) {
      case 'practical_life': return 'bg-blue-100 text-blue-700';
      case 'sensorial': return 'bg-purple-100 text-purple-700';
      case 'language': return 'bg-green-100 text-green-700';
      case 'mathematics': return 'bg-red-100 text-red-700';
      case 'cultural': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-lg">
        <p>{error}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-red-700 underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }
  
  if (!activity) {
    return <div>No activity found</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href={child ? `/dashboard/children/${childId}` : '/dashboard/activities'} className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {child ? `Back to ${child.name}'s Profile` : 'Back to Activities'}
        </Link>
        
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{activity.title}</h1>
        
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activity.area && (
            <span className={`text-xs px-2 py-1 rounded-full ${getAreaColorClass(activity.area)}`}>
              {formatArea(activity.area)}
            </span>
          )}
          
          {activity.duration && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {activity.duration} minutes
            </span>
          )}
          
          {activity.difficulty && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
              {activity.difficulty}
            </span>
          )}
          
          {activity.ageRanges && activity.ageRanges.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              Ages {activity.ageRanges.join(', ')}
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Activity details card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Activity Details</h2>
            </div>
            
            <div className="p-6">
              {activity.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600">{activity.description}</p>
                </div>
              )}
              
              {activity.instructions && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions</h3>
                  <div className="prose prose-sm max-w-none text-gray-600">
                    {activity.instructions.split('\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {activity.materialsNeeded && activity.materialsNeeded.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Materials Needed</h3>
                  <ul className="list-disc pl-5 text-gray-600">
                    {activity.materialsNeeded.map((material, index) => (
                      <li key={index}>{material}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {activity.skillsAddressed && activity.skillsAddressed.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Skills Addressed</h3>
                  <div className="flex flex-wrap gap-2">
                    {activity.skillsAddressed.map(skillId => (
                      <span key={skillId} className="bg-emerald-50 text-emerald-700 px-2 py-1 text-xs rounded-full">
                        {skillId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress tracking section - only show if childId is provided */}
          {childId && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Observation Tracking</h2>
              </div>
              
              <ActivityObservationForm 
                activityId={id} 
                childId={childId} 
                onSuccess={() => {
                  // Optionally refresh any data after successful observation
                }}
              />
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* What to observe card */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center">
              <Target className="h-5 w-5 text-emerald-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">What to Observe</h2>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                  <span>Can the child follow multi-step instructions?</span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                  <span>How long does the child maintain concentration?</span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                  <span>Does the child repeat the activity without prompting?</span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                  <span>How does the child handle frustration if encountered?</span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                  <span>Does the child notice and correct their own mistakes?</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Extensions card */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center">
              <BarChart2 className="h-5 w-5 text-emerald-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Extensions</h2>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                  <span>Increase difficulty by adding time constraints</span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                  <span>Use different materials for sensory variation</span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                  <span>Have the child teach the activity to a sibling or friend</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Related resources */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center">
              <Book className="h-5 w-5 text-emerald-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Related Resources</h2>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3 text-gray-600">
                {activity.relatedActivities && activity.relatedActivities.length > 0 ? (
                  activity.relatedActivities.map(relatedId => (
                    <li key={relatedId} className="flex items-start">
                      <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                      <Link 
                        href={`/dashboard/activities/${relatedId}${childId ? `?childId=${childId}` : ''}`}
                        className="text-emerald-600 hover:underline"
                      >
                        Related Activity
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500 italic">No related resources available</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}