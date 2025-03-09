"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import SimplifiedActivityDashboard from '@/app/components/parent/SimplifiedActivityDashboard';
import QuickObservationForm from '@/app/components/parent/QuickObservationForm';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ChildDashboardPage({ params }: { params: { id: string } }) {
  const { currentUser } = useAuth();
  const childId = params.id;
  
  const [childName, setChildName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showObservationForm, setShowObservationForm] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<{ id: string, title: string } | null>(null);
  
  // Fetch child data to get the name
  useEffect(() => {
    const fetchChildData = async () => {
      if (!childId || !currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
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
          setError('You do not have permission to view this child');
          setLoading(false);
          return;
        }
        
        setChildName(childData.name);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching child data:', err);
        setError('Failed to load child information');
        setLoading(false);
      }
    };
    
    fetchChildData();
  }, [childId, currentUser]);
  
  const handleActivitySelect = (activityId: string, activityTitle: string) => {
    setSelectedActivity({ id: activityId, title: activityTitle });
    setShowObservationForm(true);
  };
  
  const handleObservationSuccess = () => {
    setShowObservationForm(false);
    setSelectedActivity(null);
    // You might want to refresh activity data here
  };
  
  const handleCloseObservationForm = () => {
    setShowObservationForm(false);
    setSelectedActivity(null);
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
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{childName}'s Dashboard</h1>
      
      {showObservationForm && selectedActivity && (
        <div className="mb-6">
          <QuickObservationForm
            activityId={selectedActivity.id}
            childId={childId}
            activityTitle={selectedActivity.title}
            onSuccess={handleObservationSuccess}
            onClose={handleCloseObservationForm}
          />
        </div>
      )}
      
      <div className="space-y-6">
        {/* Today's Activities */}
        <SimplifiedActivityDashboard 
          childId={childId} 
          childName={childName}
          onActivitySelect={handleActivitySelect} 
        />
        
        {/* Additional dashboard widgets would go here */}
        {/* For example: Recent observations, skill progress, etc. */}
      </div>
    </div>
  );
}