// app/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoPlanGeneration } from '@/hooks/useAutoPlanGeneration';
import { 
  BookOpen, 
  BarChart2, 
  Settings, 
  Loader2,
  User,
  Package,
  ArrowUpRight,
  Users,
  Award,
  Book,
  Calendar,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { format, subMonths } from 'date-fns';
import WeeklyPlanWithDayFocus from '@/app/components/parent/WeeklyPlanWithDayFocus';
import AllChildrenWeeklyView from '@/app/components/parent/AllChildrenWeeklyView';
import AllChildrenMaterialsForecast from '@/app/components/parent/AllChildrenMaterialsForecast';
import SchedulePreferencesSidebar from '@/app/components/parent/SchedulePreferencesSidebar';
import { ErrorBoundary } from 'react-error-boundary';
import { getDocs, query, where, collection, doc, updateDoc, arrayUnion, getDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProgressCelebration from '@/components/parent/ProgressCelebration';
import { Timestamp } from 'firebase/firestore';
import { DevelopmentalSkill } from '@/lib/types/enhancedSchema';

interface ChildSkill {
  id: string;
  childId: string;
  skillId: string;
  skillName?: string;
  status: 'not_started' | 'emerging' | 'developing' | 'mastered';
  lastAssessed?: Timestamp;
}

interface Child {
  id: string;
  name: string;
  birthDate?: any;
  ageGroup?: string;
  interests?: string[];
  active?: boolean;
  skillProgress?: {
    emerging: number;
    developing: number;
    mastered: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { isGenerating: isAutoGenerating } = useAutoPlanGeneration();
  
  // Parse URL parameters
  const dateParam = searchParams.get('date');
  const childIdParam = searchParams.get('childId');
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(
    dateParam ? new Date(dateParam) : new Date()
  );
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(
    childIdParam ?? undefined
  );
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [recentSkills, setRecentSkills] = useState<ChildSkill[]>([]);
  const [allSkills, setAllSkills] = useState<DevelopmentalSkill[]>([]);
  const materialsForecastRef = useRef<{ fetchMaterialsNeeded: () => void }>(null);
  
  // Update URL when parameters change
  const updateUrlParams = useCallback((date?: Date, childId?: string) => {
    const params = new URLSearchParams();
    
    if (date) {
      params.set('date', format(date, 'yyyy-MM-dd'));
    }
    
    if (childId) {
      params.set('childId', childId);
    }
    
    // Replace current URL to maintain navigation history
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }, [router]);
  
  // Fetch children and their skills
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        
        // Fetch children
        const childrenQuery = query(
          collection(db, 'children'),
          where('userId', '==', currentUser.uid)
        );
        const childrenSnapshot = await getDocs(childrenQuery);
        const childrenData = childrenSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Child[];
        setChildren(childrenData);

        // Set default selected child if not set
        if (!selectedChildId && childrenData.length > 0) {
          setSelectedChildId(childrenData[0].id);
          updateUrlParams(selectedDate, childrenData[0].id);
        }

        // Fetch all developmental skills
        const devSkillsSnapshot = await getDocs(collection(db, 'developmentalSkills'));
        const devSkillsData = devSkillsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DevelopmentalSkill[];
        setAllSkills(devSkillsData);

        // Fetch all skills for all children
        const skillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', 'in', childrenData.map(child => child.id))
        );
        const skillsSnapshot = await getDocs(skillsQuery);
        const skillsData = skillsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ChildSkill[];
        setRecentSkills(skillsData);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);
  
  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    updateUrlParams(date, selectedChildId);
  }, [selectedChildId, updateUrlParams]);
  
  // Handle child selection
  const handleChildSelect = useCallback((childId: string) => {
    setSelectedChildId(childId);
    updateUrlParams(selectedDate, childId);
  }, [selectedDate, updateUrlParams]);
  
  // Handle generate plan
  const handleGeneratePlan = async (childId: string, weekDate?: Date): Promise<void> => {
    if (!childId || !currentUser) {
      throw new Error('Missing child ID or user');
    }
    
    try {
      setIsGeneratingPlan(true);
      
      // Check if user has schedule preferences
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      const hasSchedulePreferences = userData?.preferences?.activityPreferences?.scheduleByDay;
      
      // If no schedule preferences exist, set default preferences
      if (!hasSchedulePreferences) {
        const defaultSchedule = {
          monday: 2,
          tuesday: 0,
          wednesday: 2,
          thursday: 0,
          friday: 2,
          saturday: 0,
          sunday: 0
        };
        
        await updateDoc(doc(db, 'users', currentUser.uid), {
          'preferences.activityPreferences.scheduleByDay': defaultSchedule,
          updatedAt: new Date()
        });
      }
      
      // Import and use your plan generator with the week date
      const { generateWeeklyPlan } = await import('@/lib/planGenerator');
      await generateWeeklyPlan(childId, currentUser.uid, weekDate);
      
    } catch (error) {
      console.error('Error generating plan:', error);
      throw error;
    } finally {
      setIsGeneratingPlan(false);
    }
  };
  
  // Initialize when auth is ready
  useEffect(() => {
    if (currentUser !== undefined) {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Update the handleMarkMaterialOwned function
  const handleMarkMaterialOwned = async (materialId: string) => {
    if (!currentUser) return;
    
    try {
      // Create a document in userMaterials collection
      const userMaterialRef = doc(db, 'userMaterials', `${currentUser.uid}_${materialId}`);
      
      // Add the material to user's inventory
      await setDoc(userMaterialRef, {
        userId: currentUser.uid,
        materialId: materialId,
        inInventory: true,
        addedAt: new Date()
      });
      
      // Force a refresh of the materials forecast
      if (materialsForecastRef.current) {
        materialsForecastRef.current.fetchMaterialsNeeded();
      }
      
      // Add a small delay to ensure the database update is complete
      setTimeout(() => {
        if (materialsForecastRef.current) {
          materialsForecastRef.current.fetchMaterialsNeeded();
        }
      }, 500);
      
    } catch (error) {
      console.error('Error marking material as owned:', error);
    }
  };
  
  const handleSchedulePreferencesUpdated = async () => {
    // Refresh the current view to reflect new schedule
    if (selectedChildId) {
      try {
        // Generate a new plan
        await handleGeneratePlan(selectedChildId, selectedDate);
        
        // Force a refresh of the weekly plan view by updating the selected date
        // This will trigger a re-render of the WeeklyPlanWithDayFocus component
        setSelectedDate(new Date(selectedDate));
      } catch (error) {
        console.error('Error updating schedule preferences:', error);
      }
    }
  };
  
  // Loading state
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
  
  // Error state
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
        {/* Header with child selector */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Dashboard</h1>
              <p className="text-gray-600">
                Welcome to Learn Sprout, your personalized early childhood development platform
              </p>
            </div>
            
            {/* Child selector */}
            {children.length > 0 && (
              <div className="flex items-center gap-3">
                <label htmlFor="child-selector" className="text-sm font-medium text-gray-700">
                  Viewing:
                </label>
                <select
                  id="child-selector"
                  value={selectedChildId || ''}
                  onChange={(e) => handleChildSelect(e.target.value)}
                  className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base font-medium"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        
        {/* Show auto-generation status */}
        {isAutoGenerating && (
          <div className="bg-blue-50 text-blue-700 p-2 rounded-md mb-4 flex items-center text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating personalized activity plans for your child...
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content - Weekly View */}
          <div className="lg:col-span-8">
            {children.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-lg font-medium text-gray-900 mb-2">Welcome to Learn Sprout!</h2>
                <p className="text-gray-600 mb-4">
                  Get started by adding your first child to begin creating personalized activity plans.
                </p>
                <Link
                  href="/dashboard/children/add"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Add Child Profile
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <WeeklyPlanWithDayFocus 
                  selectedDate={selectedDate}
                  selectedChildId={selectedChildId}
                  onGeneratePlan={handleGeneratePlan}
                />
                
                {/* Materials Needed */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Materials Needed</h2>
                    <button
                      onClick={() => materialsForecastRef.current?.fetchMaterialsNeeded()}
                      className="text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-2">
                    <AllChildrenMaterialsForecast
                      ref={materialsForecastRef}
                      selectedChildId={selectedChildId}
                      onMarkMaterialOwned={handleMarkMaterialOwned}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar - Progress and Materials */}
          <div className="lg:col-span-4 space-y-6">
            {/* Schedule Preferences */}
            <SchedulePreferencesSidebar onPreferencesUpdated={handleSchedulePreferencesUpdated} />
            
            {/* Progress Overview */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Children's Progress</h2>
              <div className="space-y-6">
                {children.map((child) => {
                  // Get meaningful skills for this child, joined with skill names
                  const skillNameMap = Object.fromEntries(allSkills.map(s => [s.id, s.name]));
                  const childSkills = recentSkills
                    .filter(skill => skill.childId === child.id)
                    .map(skill => ({
                      ...skill,
                      skillName: skill.skillName || 'Unknown Skill',
                      lastAssessed: skill.lastAssessed && typeof skill.lastAssessed.toDate === 'function' ? skill.lastAssessed.toDate().toISOString() : (typeof skill.lastAssessed === 'string' ? skill.lastAssessed : '')
                    }))
                    .sort((a, b) => new Date(b.lastAssessed).getTime() - new Date(a.lastAssessed).getTime())
                    .reduce((acc: any[], skill) => {
                      if (skill.status === 'developing' && acc.filter(s => s.status === 'developing').length < 3) {
                        acc.push(skill);
                      } else if (skill.status === 'mastered' && acc.filter(s => s.status === 'mastered').length < 2) {
                        acc.push(skill);
                      }
                      return acc;
                    }, [] as any[]);

                  return (
                    <ProgressCelebration
                      key={child.id}
                      childId={child.id}
                      childName={child.name}
                      recentMilestones={childSkills}
                    />
                  );
                })}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/activities"
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Activities
                </Link>
                <Link
                  href="/dashboard/development"
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Development
                </Link>
                <Link
                  href={`/dashboard/children/${selectedChildId}/development`}
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Child Journey
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
                <Link
                  href="/dashboard/materials"
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Materials
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}