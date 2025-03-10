"use client"
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  getChild, 
  getWeeklyPlan,
  getChildWeeklyPlans
} from '@/lib/dataService';
import { 
  ArrowLeft, 
  Calendar,
  ListIcon,
  Lightbulb,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WeekAtAGlanceView from '@/app/components/parent/WeekAtAGlanceView';
import DailyActivitiesDashboard from '@/app/components/parent/DailyActivitiesDashboard';
import { Timestamp } from 'firebase/firestore';

interface WeeklyPlanPageProps {
  params: {
    id: string;
  };
}

export default function WeeklyPlanPage({ params }: WeeklyPlanPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id: childId } = params;
  const planIdFromUrl = searchParams.get('planId');
  const viewFromUrl = searchParams.get('view');
  
  const { currentUser, activeRole } = useAuth();
  const [child, setChild] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>(
    viewFromUrl === 'weekly' ? 'weekly' : 'daily'
  );

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch child data
        const childData = await getChild(childId);
        if (!childData) {
          setError('Child not found');
          setLoading(false);
          return;
        }
        setChild(childData);
        setLoading(false);
      } catch (error: any) {
        setError('Error fetching data: ' + error.message);
        setLoading(false);
      }
    }

    fetchData();
  }, [childId]);

  const handleTabChange = (tab: 'daily' | 'weekly') => {
    setActiveTab(tab);
    
    // Update URL to reflect the current view
    const newUrl = new URL(window.location.href);
    if (tab === 'weekly') {
      newUrl.searchParams.set('view', 'weekly');
    } else {
      newUrl.searchParams.set('view', 'daily');
    }
    
    if (planIdFromUrl) {
      newUrl.searchParams.set('planId', planIdFromUrl);
    }
    
    router.push(newUrl.pathname + newUrl.search);
  };

  // Handle day selection from weekly view
  const handleDaySelected = (date: Date) => {
    setSelectedDate(date);
    setActiveTab('daily');
    
    // Update URL to reflect day selection
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('view', 'daily');
    newUrl.searchParams.set('date', date.toISOString().split('T')[0]);
    
    if (planIdFromUrl) {
      newUrl.searchParams.set('planId', planIdFromUrl);
    }
    
    router.push(newUrl.pathname + newUrl.search);
  };
  
  // Handle back to child profile
  const handleBackToProfile = () => {
    router.push(`/dashboard/children/${childId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin h-12 w-12 text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>{error}</p>
        <Link href={`/dashboard/children/${childId}`} className="mt-4 inline-block text-red-700 underline">
          Back to Child Profile
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <Link href={`/dashboard/children/${childId}`} className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {child?.name}'s Profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Activities Plan</h1>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleTabChange('daily')}
            className={`flex items-center px-4 py-3 text-sm font-medium ${
              activeTab === 'daily' 
                ? 'text-emerald-600 border-b-2 border-emerald-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Daily View
          </button>
          
          <button
            onClick={() => handleTabChange('weekly')}
            className={`flex items-center px-4 py-3 text-sm font-medium ${
              activeTab === 'weekly' 
                ? 'text-emerald-600 border-b-2 border-emerald-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ListIcon className="h-4 w-4 mr-2" />
            Weekly View
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'daily' ? (
        <DailyActivitiesDashboard 
          childId={childId} 
          childName={child?.name || ''}
          userId={currentUser?.uid || ''}
          selectedDate={selectedDate}
        />
      ) : (
        <WeekAtAGlanceView 
          childId={childId} 
          childName={child?.name || ''}
          onSelectDay={handleDaySelected}
          onBackToDaily={() => handleTabChange('daily')}
        />
      )}
    </div>
  );
}