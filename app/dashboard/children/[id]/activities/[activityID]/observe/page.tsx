"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import DailyActivitiesDashboard from '@/app/components/parent/DailyActivitiesDashboard';
import WeekAtAGlanceView from '@/app/components/parent/WeekAtAGlanceView';
import { Loader2, ArrowLeft, AlertCircle, Calendar, ListIcon } from 'lucide-react';

export default function ChildActivitiesPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') || 'daily';
  const childId = params.id;
  
  // State
  const [childName, setChildName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'daily' | 'weekly'>(initialView === 'weekly' ? 'weekly' : 'daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Fetch child data
  useEffect(() => {
    const fetchChildData = async () => {
      if (!childId || !currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch child data to verify ownership
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
  
  // Handle view toggle
  const handleViewToggle = (view: 'daily' | 'weekly') => {
    setActiveView(view);
    
    // Remember this preference in localStorage
    try {
      localStorage.setItem(`${childId}_preferred_activity_view`, view);
    } catch (e) {
      // Ignore localStorage errors
    }
  };
  
  // Handle day selection from weekly view
  const handleDaySelected = (date: Date) => {
    setSelectedDate(date);
    setActiveView('daily');
  };
  
  // Load user preference on first render
  useEffect(() => {
    try {
      const savedPreference = localStorage.getItem(`${childId}_preferred_activity_view`);
      if (savedPreference === 'daily' || savedPreference === 'weekly') {
        setActiveView(savedPreference);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [childId]);
  
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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <Link href={`/dashboard/children/${childId}`} className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {childName}'s Profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{childName}'s Activities</h1>
      </div>

      {/* Toggle between daily and weekly views */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleViewToggle('daily')}
            className={`flex items-center px-4 py-3 text-sm font-medium ${
              activeView === 'daily' 
                ? 'text-emerald-600 border-b-2 border-emerald-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            type="button"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Daily View
          </button>
          
          <button
            onClick={() => handleViewToggle('weekly')}
            className={`flex items-center px-4 py-3 text-sm font-medium ${
              activeView === 'weekly' 
                ? 'text-emerald-600 border-b-2 border-emerald-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            type="button"
          >
            <ListIcon className="h-4 w-4 mr-2" />
            Weekly View
          </button>
        </div>
      </div>

      {/* Render the appropriate view */}
      {activeView === 'daily' ? (
        <DailyActivitiesDashboard 
          childId={childId} 
          childName={childName}
          userId={currentUser?.uid || ''}
          selectedDate={selectedDate}
        />
      ) : (
        <WeekAtAGlanceView 
          childId={childId} 
          childName={childName}
          onSelectDay={handleDaySelected}
          onBackToDaily={() => handleViewToggle('daily')}
        />
      )}
    </div>
  );
}