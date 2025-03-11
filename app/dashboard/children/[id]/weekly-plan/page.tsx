"use client"
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getChild } from '@/lib/dataService';
import { 
  ArrowLeft, 
  Calendar,
  Loader2,
  InfoIcon,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WeekAtAGlanceView from '@/app/components/parent/WeekAtAGlanceView';

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
  
  const { currentUser } = useAuth();
  const [child, setChild] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  
  // Use a ref to prevent URL update loops
  const isUrlUpdating = useRef(false);

  // Fetch child data once on initial render
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      try {
        const childData = await getChild(childId);
        if (!childData) {
          if (isMounted) {
            setError('Child not found');
            setLoading(false);
          }
          return;
        }
        
        if (isMounted) {
          setChild(childData);
          setLoading(false);
        }
      } catch (error: any) {
        if (isMounted) {
          setError('Error fetching data: ' + error.message);
          setLoading(false);
        }
      }
    }

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [childId]);

  // Handle generating a new weekly plan
  const handleGenerateWeeklyPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      // Here you would call your API to generate a new weekly plan
      // For now, we'll just refresh the page after a delay to simulate
      setTimeout(() => {
        router.refresh();
        setIsGeneratingPlan(false);
      }, 2000);
    } catch (error) {
      console.error('Error generating weekly plan:', error);
      setIsGeneratingPlan(false);
    }
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
      <div className="mb-2">
        <Link href={`/dashboard/children/${childId}`} className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {child?.name}'s Profile
        </Link>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Activities Plan</h1>
        
        <button
          onClick={handleGenerateWeeklyPlan}
          disabled={isGeneratingPlan}
          className="inline-flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingPlan ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate New Plan
            </>
          )}
        </button>
      </div>

      {/* Weekly Plan View */}
      <WeekAtAGlanceView 
        childId={childId} 
        childName={child?.name || ''}
      />
      
      {/* Help Info Box */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-start">
          <InfoIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>What is Weekly Planning?</strong> This feature helps you organize activities for your child throughout the week.
            </p>
            <p className="mb-2">
              Activities are auto-generated based on your child's age, interests, and developmental needs. You can view the entire week at once to plan ahead.
            </p>
            <p>
              <strong>Need a new plan?</strong> Click the "Generate New Plan" button above to create a fresh set of activities tailored to your child's current development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}