"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import QuickObservationForm from '@/app/components/parent/QuickObservationForm';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ActivityObservationPage({ 
  params 
}: { 
  params: { childId: string; activityId: string } 
}) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { childId, activityId } = params;
  
  const [childName, setChildName] = useState<string>('');
  const [activityData, setActivityData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch child and activity data
  useEffect(() => {
    const fetchData = async () => {
      if (!childId || !activityId || !currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch child data first to verify ownership
        const childRef = doc(db, 'children', childId);
        const childDoc = await getDoc(childRef);
        
        if (!childDoc.exists()) {
          setError('Child not found');
          setLoading(false);
          return;
        }
        
        const childData = childDoc.data();
        
        // Verify this child belongs to the current user
        if (childData.userId !== currentUser.uid) {
          setError('You do not have permission to access this page');
          setLoading(false);
          return;
        }
        
        setChildName(childData.name);
        
        // Fetch activity data
        const activityRef = doc(db, 'activities', activityId);
        const activityDoc = await getDoc(activityRef);
        
        if (!activityDoc.exists()) {
          setError('Activity not found');
          setLoading(false);
          return;
        }
        
        setActivityData({
          id: activityDoc.id,
          ...activityDoc.data()
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load information');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [childId, activityId, currentUser]);
  
  const handleObservationSuccess = () => {
    // Redirect back to the child's activity page or dashboard
    router.push(`/dashboard/children/${childId}/activities`);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg flex items-start text-red-800 max-w-3xl mx-auto my-6">
        <AlertCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center mb-6">
        <Link href={`/dashboard/children/${childId}/activities`} className="mr-4 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Record Observation</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-1">
        <QuickObservationForm 
          childId={childId}
          activityId={activityId}
          activityTitle={activityData?.title || 'Activity'} 
          onSuccess={handleObservationSuccess}
          onClose={() => router.back()}
        />
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>Recording an observation helps track {childName}'s progress and engagement with activities.</p>
      </div>
    </div>
  );
}