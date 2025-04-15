// app/dashboard/activities/[id]/page.tsx
"use client"
import React from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getActivity, getChild } from '@/lib/dataService';
import { ActivityObservationForm } from '@/app/components/ActivityObservationForm';
import { ArrowLeft, Clock, BarChart2, Target, Book, Layers, ClipboardList, Eye, ArrowRight, CheckCircle } from 'lucide-react';

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
  setupSteps?: string[];
  demonstrationSteps?: string[];
  observationPoints?: string[];
  successIndicators?: string[];
  commonChallenges?: string[];
  extensions?: string[];
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
  const [activeTab, setActiveTab] = useState<'setup' | 'instructions' | 'observation' | 'extensions'>('setup');
  
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

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'setup'
                ? 'text-emerald-600 border-emerald-500'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <Layers className="h-4 w-4 mr-2" />
              Setup
            </div>
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'instructions'
                ? 'text-emerald-600 border-emerald-500'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <ClipboardList className="h-4 w-4 mr-2" />
              Instructions
            </div>
          </button>
          <button
            onClick={() => setActiveTab('observation')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'observation'
                ? 'text-emerald-600 border-emerald-500'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Observation
            </div>
          </button>
          <button
            onClick={() => setActiveTab('extensions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'extensions'
                ? 'text-emerald-600 border-emerald-500'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 mr-2" />
              Extensions
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {activeTab === 'setup' && (
          <div className="p-6 space-y-6">
            {/* Materials Needed */}
            {activity.materialsNeeded && activity.materialsNeeded.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Materials Needed</h3>
                <ul className="space-y-2">
                  {activity.materialsNeeded.map((material, index) => (
                    <li key={index} className="flex items-start">
                      <span className="h-5 w-5 text-emerald-500 mr-2">•</span>
                      <span className="text-gray-700">{material}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Setup Steps */}
            {activity.setupSteps && activity.setupSteps.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Setup Steps</h3>
                <div className="bg-white rounded-lg border border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    {activity.setupSteps.map((step, index) => (
                      <li key={index} className="p-4 flex items-start">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-emerald-800 mb-2">How to Present This Activity</h3>
              <p className="text-sm text-emerald-700">
                Follow these steps to introduce the activity to your child for the first time:
              </p>
            </div>

            {activity.demonstrationSteps && activity.demonstrationSteps.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {activity.demonstrationSteps.map((step, index) => (
                    <li key={index} className="p-4 flex items-start">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'observation' && (
          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-emerald-800 mb-2">What to Watch For</h3>
              <p className="text-sm text-emerald-700">
                Observe these key points as your child works with the activity:
              </p>
            </div>

            {activity.observationPoints && activity.observationPoints.length > 0 && (
              <ul className="space-y-3">
                {activity.observationPoints.map((point, index) => (
                  <li key={index} className="flex items-start bg-white p-4 rounded-lg border border-gray-200">
                    <Eye className="h-5 w-5 text-emerald-500 mr-3 mt-0.5" />
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {activity.successIndicators && activity.successIndicators.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Key Signs of Success</h3>
                <ul className="space-y-3">
                  {activity.successIndicators.slice(0, 3).map((indicator, index) => (
                    <li key={index} className="flex items-start bg-white p-4 rounded-lg border border-gray-200">
                      <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 mt-0.5" />
                      <span className="text-gray-700">{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'extensions' && (
          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-emerald-800 mb-2">Next Steps</h3>
              <p className="text-sm text-emerald-700">
                When your child shows mastery, try these variations to extend the learning:
              </p>
            </div>

            {activity.extensions && activity.extensions.length > 0 && (
              <ul className="space-y-3">
                {activity.extensions.map((extension, index) => (
                  <li key={index} className="flex items-start bg-white p-4 rounded-lg border border-gray-200">
                    <ArrowRight className="h-5 w-5 text-emerald-500 mr-3 mt-0.5" />
                    <span className="text-gray-700">{extension}</span>
                  </li>
                ))}
              </ul>
            )}

            {activity.commonChallenges && activity.commonChallenges.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Common Challenges to Watch For</h3>
                <ul className="space-y-3">
                  {activity.commonChallenges.slice(0, 3).map((challenge, index) => (
                    <li key={index} className="flex items-start bg-white p-4 rounded-lg border border-gray-200">
                      <Target className="h-5 w-5 text-emerald-500 mr-3 mt-0.5" />
                      <span className="text-gray-700">{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress tracking section - only show if childId is provided */}
      {childId && (
        <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
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
  );
}