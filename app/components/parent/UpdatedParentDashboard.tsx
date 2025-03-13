// app/components/parent/UpdatedParentDashboard.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { 
  Plus, 
  Calendar, 
  BookOpen, 
  BarChart2, 
  Settings, 
  Loader2,
  User,
  Book
} from 'lucide-react';
import Link from 'next/link';
import ChildCard from './ChildCard';
import WeekAtAGlanceView from './WeekAtAGlanceView';
import QuickObservationForm from '../QuickObservationForm';
import AllChildrenDailyActivities from './AllChildrenDailyActivities';
import RecentProgressDashboard from './RecentProgressDashboard';
import { format } from 'date-fns';

interface Child {
  id: string;
  name: string;
  ageGroup?: string;
  birthdate?: string;
  parentId?: string;
  [key: string]: any;
}

interface UpdatedParentDashboardProps {
  hideAddChild?: boolean;
  hideMontessoriResources?: boolean;
}

export default function UpdatedParentDashboard({ 
  hideAddChild = false,
  hideMontessoriResources = false
}: UpdatedParentDashboardProps) {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  // State
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showQuickObservation, setShowQuickObservation] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<{
    childId: string;
    activityId: string;
    activityTitle: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planGenerationMessage, setPlanGenerationMessage] = useState('');
  
  // Fetch all children for the current user
  useEffect(() => {
    async function fetchChildren() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const childrenQuery = query(
          collection(db, 'children'),
          where('parentId', '==', currentUser.uid),
          orderBy('name')
        );
        
        const querySnapshot = await getDocs(childrenQuery);
        const childrenData: Child[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data && data.name) {  // Check if name exists
            childrenData.push({
              id: doc.id,
              name: data.name,
              ...data as Omit<Child, 'id' | 'name'>
            });
          } else {
            console.warn(`Child document ${doc.id} is missing required name field`);
          }
        });
        
        setChildren(childrenData);
        
        // Auto-select the first child if there's only one
        if (childrenData.length === 1) {
          setSelectedChild(childrenData[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching children:', err);
        setError('Failed to load your children. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchChildren();
  }, [currentUser]);
  
  const handleChildSelect = (child: Child) => {
    setSelectedChild(child);
  };
  
  const handleActivitySelect = (childId: string, activityId: string, activityTitle: string) => {
    setSelectedActivity({
      childId,
      activityId,
      activityTitle
    });
    setShowQuickObservation(true);
  };
  
  const handleQuickObservation = (child: Child) => {
    setSelectedChild(child);
    setShowQuickObservation(true);
  };
  
  const handleObservationSuccess = () => {
    setShowQuickObservation(false);
    setSelectedActivity(null);
  };
  
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };
  
  const handleWeeklyViewRequest = (childId?: string) => {
    if (childId) {
      router.push(`/dashboard/children/${childId}/weekly-plan`);
    } else if (selectedChild) {
      router.push(`/dashboard/children/${selectedChild.id}/weekly-plan`);
    } else {
      router.push('/dashboard/weekly-plan');
    }
  };
  
  const handleGeneratePlan = useCallback(async () => {
    if (!selectedChild || !currentUser) return;
    
    try {
      setIsGeneratingPlan(true);
      setPlanGenerationMessage('Generating your weekly plan...');
      
      // Import and use your plan generator
      const { generateWeeklyPlan } = await import('@/lib/planGenerator');
      const plan = await generateWeeklyPlan(selectedChild.id, currentUser.uid);
      
      setPlanGenerationMessage('Weekly plan generated successfully!');
      setTimeout(() => setPlanGenerationMessage(''), 3000);
      
      // Optionally navigate to the plan
      router.push(`/dashboard/children/${selectedChild.id}/weekly-plan?planId=${plan.id}`);
    } catch (error) {
      console.error('Error generating plan:', error);
      setPlanGenerationMessage('Failed to generate plan. Please try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [selectedChild, currentUser, router]);
  
  const handleViewProgressDetails = (progressId: string, childId: string) => {
    router.push(`/dashboard/children/${childId}/progress/${progressId}`);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-700">Loading your dashboard...</h2>
          <p className="text-gray-500">Just a moment please</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Children</h2>
              
              <div className="space-y-3">
                {children && children.length > 0 ? (
                  children.map((child) => (
                    <ChildCard
                      key={child.id}
                      child={child}
                      isSelected={selectedChild?.id === child.id}
                      onSelect={() => handleChildSelect(child)}
                    />
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-3">No children added yet</p>
                    {!hideAddChild && (
                      <Link
                        href="/dashboard/children/add"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                      >
                        <Plus className="-ml-1 mr-2 h-5 w-5" />
                        Add Child
                      </Link>
                    )}
                  </div>
                )}
              </div>
              
              {children && children.length > 0 && !hideAddChild && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link
                    href="/dashboard/children/add"
                    className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add another child
                  </Link>
                </div>
              )}
            </div>
            
            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h2>
              
              <div className="space-y-2">
                <Link
                  href="/dashboard/activities"
                  className="flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <BookOpen className="h-5 w-5 mr-3 text-emerald-500" />
                  <span>Activity Library</span>
                </Link>
                
                <Link
                  href="/dashboard/weekly-plan"
                  className="flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <Calendar className="h-5 w-5 mr-3 text-emerald-500" />
                  <span>Weekly Planner</span>
                </Link>
                
                <Link
                  href="/dashboard/progress"
                  className="flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <BarChart2 className="h-5 w-5 mr-3 text-emerald-500" />
                  <span>Progress Tracking</span>
                </Link>
                
                {!hideMontessoriResources && (
                  <Link
                    href="/resources"
                    className="flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <Book className="h-5 w-5 mr-3 text-emerald-500" />
                    <span>Montessori Resources</span>
                  </Link>
                )}
                
                <Link
                  href="/dashboard/settings"
                  className="flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <Settings className="h-5 w-5 mr-3 text-emerald-500" />
                  <span>Settings</span>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedChild ? `${selectedChild.name}'s Dashboard` : 'Family Dashboard'}
              </h2>
              
              {/* View mode toggle */}
              <div className="bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'daily' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-600'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'weekly' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-600'
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>
            
            {/* View mode content */}
            {viewMode === 'daily' ? (
              <div className="mb-6">
                <AllChildrenDailyActivities
                  selectedDate={selectedDate}
                  onWeeklyViewRequest={handleWeeklyViewRequest}
                  selectedChildId={selectedChild?.id}
                />
              </div>
            ) : (
              <div className="mb-6">
                {selectedChild ? (
                  <>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-emerald-800">Weekly Activity Plan</h3>
                          <p className="text-sm text-emerald-700">
                            View or generate a personalized weekly plan for {selectedChild.name}
                          </p>
                        </div>
                        <button
                          onClick={handleGeneratePlan}
                          disabled={isGeneratingPlan}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isGeneratingPlan ? 'Generating...' : 'Generate Plan'}
                        </button>
                      </div>
                      {planGenerationMessage && (
                        <p className="mt-2 text-sm text-emerald-700">{planGenerationMessage}</p>
                      )}
                    </div>
                    
                    <WeekAtAGlanceView 
                      childId={selectedChild.id} 
                      childName={selectedChild.name}
                      onSelectDay={(date) => {
                        setViewMode('daily');
                        setSelectedDate(date);
                      }}
                      onBackToDaily={() => setViewMode('daily')}
                    />
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Weekly View</h3>
                    <p className="text-gray-500 mb-4">
                      Select a child to view or generate their weekly activity plan
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                      {children && children.length > 0 ? children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedChild(child)}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-medium">
                              {child.name.charAt(0)}
                            </div>
                            <span className="ml-2 font-medium">{child.name}</span>
                          </div>
                        </button>
                      )) : (
                        <p>No children available</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Recent Progress */}
            <RecentProgressDashboard
              childrenData={children}
              selectedChildId={selectedChild?.id || null}
              limit={5}
              onViewDetails={handleViewProgressDetails}
            />
          </div>
        </div>
      </div>
      
      {/* Quick Observation Modal */}
      {showQuickObservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            {selectedActivity ? (
              <QuickObservationForm
                childId={selectedActivity.childId}
                activityId={selectedActivity.activityId}
                activityTitle={selectedActivity.activityTitle}
                onSuccess={handleObservationSuccess}
                onClose={() => setShowQuickObservation(false)}
              >
                {/* Add any additional content here */}
              </QuickObservationForm>
            ) : selectedChild ? (
              <QuickObservationForm
                childId={selectedChild.id}
                childName={selectedChild.name}
                onSuccess={handleObservationSuccess}
                onClose={() => setShowQuickObservation(false)}
              >
                {/* Add any additional content here */}
              </QuickObservationForm>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}