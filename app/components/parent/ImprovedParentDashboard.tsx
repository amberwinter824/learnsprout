// app/components/parent/ImprovedParentDashboard.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { 
  Plus, 
  Calendar, 
  BookOpen, 
  BarChart2, 
  Settings, 
  Loader2,
  User,
  Bell,
  MessageSquare,
  Book
} from 'lucide-react';
import Link from 'next/link';
import ChildCard from './ChildCard';
import WeekAtAGlanceView from './WeekAtAGlanceView';
import QuickObservationForm from '../QuickObservationForm';
import { format, startOfWeek, addDays } from 'date-fns';
import { generateWeeklyPlan } from '@/lib/planGenerator';

interface Child {
  id: string;
  name: string;
  ageGroup?: string;
  birthdate?: string;
  parentId?: string;
  [key: string]: any;
}

interface ImprovedParentDashboardProps {
  hideAddChild?: boolean;
  hideMontessoriResources?: boolean;
}

export default function ImprovedParentDashboard({ 
  hideAddChild = false,
  hideMontessoriResources = false
}: ImprovedParentDashboardProps) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showQuickObservation, setShowQuickObservation] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');
  const [recentObservations, setRecentObservations] = useState<any[]>([]);
  const [recentSkills, setRecentSkills] = useState<any[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planGenerationMessage, setPlanGenerationMessage] = useState('');
  const [filterByChild, setFilterByChild] = useState<string | null>(null);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  
  useEffect(() => {
    async function fetchChildren() {
      if (!currentUser) return;
      
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
  
  useEffect(() => {
    async function fetchRecentData() {
      if (!selectedChild) return;
      
      try {
        // Fetch recent observations
        const observationsQuery = query(
          collection(db, 'observations'),
          where('childId', '==', selectedChild.id),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const observationsSnapshot = await getDocs(observationsQuery);
        const observationsData = observationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRecentObservations(observationsData);
        
        // Fetch recent skills
        const skillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', selectedChild.id),
          where('status', 'in', ['emerging', 'developing', 'mastered']),
          orderBy('updatedAt', 'desc'),
          limit(5)
        );
        
        const skillsSnapshot = await getDocs(skillsQuery);
        const skillsData = skillsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRecentSkills(skillsData);
      } catch (err) {
        console.error('Error fetching recent data:', err);
      }
    }
    
    fetchRecentData();
  }, [selectedChild]);
  
  useEffect(() => {
    async function fetchAllActivities() {
      if (!currentUser || children.length === 0) return;
      
      try {
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Create an array of child IDs
        const childIds = children.map(child => child.id);
        
        // Query for activities for all children
        const activitiesQuery = query(
          collection(db, 'weeklyPlans'),
          where('childId', 'in', childIds),
          // Add any other filters you need
        );
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activitiesData: any[] = [];
        
        activitiesSnapshot.forEach(doc => {
          const planData = doc.data();
          const childId = planData.childId;
          const child = children.find(c => c.id === childId);
          
          // Get activities for each day
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          
          days.forEach(day => {
            if (planData[day] && Array.isArray(planData[day])) {
              planData[day].forEach((activity: any) => {
                activitiesData.push({
                  ...activity,
                  day,
                  childId,
                  childName: child?.name || 'Unknown Child',
                  planId: doc.id
                });
              });
            }
          });
        });
        
        setAllActivities(activitiesData);
      } catch (err) {
        console.error('Error fetching activities:', err);
      }
    }
    
    fetchAllActivities();
  }, [children, currentUser]);
  
  const handleChildSelect = (child: Child) => {
    setSelectedChild(child);
  };
  
  const handleQuickObservation = (child: Child) => {
    setSelectedChild(child);
    setShowQuickObservation(true);
  };
  
  const handleObservationSuccess = () => {
    setShowQuickObservation(false);
  };
  
  const handleGeneratePlan = useCallback(async () => {
    if (!selectedChild || !currentUser) return;
    
    try {
      setIsGeneratingPlan(true);
      setPlanGenerationMessage('Generating your weekly plan...');
      
      const plan = await generateWeeklyPlan(selectedChild.id, currentUser.uid);
      
      setPlanGenerationMessage('Weekly plan generated successfully!');
      setTimeout(() => setPlanGenerationMessage(''), 3000);
      
      // Optionally navigate to the plan
      // router.push(`/dashboard/children/${selectedChild.id}/plan/${plan.id}`);
    } catch (error) {
      console.error('Error generating plan:', error);
      setPlanGenerationMessage('Failed to generate plan. Please try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [selectedChild, currentUser, router]);
  
  const handleFilterChange = (childId: string | null) => {
    setFilterByChild(childId);
    if (childId) {
      const child = children.find(c => c.id === childId);
      if (child) setSelectedChild(child);
    } else {
      setSelectedChild(null);
    }
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
                {children.length > 0 ? (
                  children.map((child) => (
                    <ChildCard
                      key={child.id}
                      child={child}
                      isSelected={selectedChild?.id === child.id}
                      onSelect={() => handleChildSelect(child)}
                      onObserve={() => handleQuickObservation(child)}
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
              
              {children.length > 0 && !hideAddChild && (
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
              <div className="flex items-center space-x-4">
                <select 
                  className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm"
                  value={filterByChild || ''}
                  onChange={(e) => handleFilterChange(e.target.value || null)}
                >
                  <option value="">All Children</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
                <div className="bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('daily')}
                    className={`px-3 py-1 text-sm rounded-md ${
                      viewMode === 'daily' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`px-3 py-1 text-sm rounded-md ${
                      viewMode === 'weekly' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    Weekly
                  </button>
                </div>
              </div>
            </div>
            
            {viewMode === 'daily' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Today's Activities {filterByChild ? `for ${selectedChild?.name}` : 'for All Children'}
                </h3>
                
                <div className="space-y-4">
                  {allActivities.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {allActivities
                        .filter(activity => filterByChild ? activity.childId === filterByChild : true)
                        .map((activity, index) => (
                          <div key={index} className="py-3">
                            <div className="flex justify-between">
                              <div>
                                <h4 className="font-medium text-gray-800">{activity.activityTitle || 'Unnamed Activity'}</h4>
                                <p className="text-sm text-gray-600">{activity.timeSlot} • {activity.day}</p>
                              </div>
                              {!filterByChild && (
                                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                                  {activity.childName}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{activity.notes || 'No notes'}</p>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <p className="text-gray-600">No activities scheduled. Generate a weekly plan to get started.</p>
                  )}
                  
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={handleGeneratePlan}
                      disabled={isGeneratingPlan || !selectedChild}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isGeneratingPlan ? 'Generating...' : 'Generate Plan'}
                    </button>
                    {selectedChild && (
                      <button
                        onClick={() => setShowQuickObservation(true)}
                        className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-md hover:bg-emerald-50"
                      >
                        Add Observation
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {selectedChild ? (
              <>
                {viewMode === 'weekly' ? (
                  <>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-emerald-800">Weekly Activity Plan</h3>
                          <p className="text-sm text-emerald-700">
                            Generate a personalized weekly plan for {selectedChild.name}
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
                      onSelectDay={(date) => router.push(`/dashboard/children/${selectedChild.id}/day/${date}`)}
                      onBackToDaily={() => router.push(`/dashboard/children/${selectedChild.id}`)}
                    />
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Activities</h3>
                    
                    <div className="space-y-4">
                      <p className="text-gray-600">
                        Here you can see activities scheduled for today. You can also add quick activities or observations.
                      </p>
                      
                      <div className="flex space-x-3 mt-4">
                        <button
                          onClick={() => router.push(`/dashboard/children/${selectedChild.id}/activities`)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                        >
                          View All Activities
                        </button>
                        <button
                          onClick={() => setShowQuickObservation(true)}
                          className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-md hover:bg-emerald-50"
                        >
                          Add Observation
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Observations</h3>
                    {recentObservations.length > 0 ? (
                      <ul className="space-y-3">
                        {recentObservations.map(obs => (
                          <li key={obs.id} className="border-b border-gray-100 pb-2">
                            <p className="text-sm text-gray-800">{obs.notes}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {obs.createdAt instanceof Timestamp 
                                ? format(obs.createdAt.toDate(), 'MMM d, yyyy')
                                : 'Recent'}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No recent observations</p>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Skill Development</h3>
                    {recentSkills.length > 0 ? (
                      <ul className="space-y-3">
                        {recentSkills.map(skill => (
                          <li key={skill.id} className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                              skill.status === 'mastered' ? 'bg-emerald-500' :
                              skill.status === 'developing' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`} />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{skill.skillName}</p>
                              <p className="text-xs text-gray-500 capitalize">{skill.status}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No skills tracked yet</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <h2 className="text-xl font-medium text-gray-700 mb-2">Welcome to Your Dashboard</h2>
                <p className="text-gray-500 mb-4">
                  {children.length > 0 
                    ? 'Select a child to view their weekly plan and activities'
                    : 'Add your first child to get started with personalized activities and tracking'}
                </p>
                
                {children.length === 0 && !hideAddChild && (
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
        </div>
      </div>
      
      {/* Quick Observation Modal */}
      {showQuickObservation && selectedChild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <QuickObservationForm
              childId={selectedChild.id}
              childName={selectedChild.name}
              onSuccess={handleObservationSuccess}
              onClose={() => setShowQuickObservation(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}