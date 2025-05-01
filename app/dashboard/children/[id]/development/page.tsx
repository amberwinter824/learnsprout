'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import DevelopmentJourneyDashboard from '@/app/components/parent/DevelopmentJourneyDashboard';
import Link from 'next/link';

export default function ChildDevelopmentPage() {
  const params = useParams();
  const childId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [childData, setChildData] = useState<any>(null);
  
  useEffect(() => {
    async function fetchChildData() {
      try {
        setLoading(true);
        
        if (!childId) {
          setError('No child ID provided');
          setLoading(false);
          return;
        }
        
        const childDoc = await getDoc(doc(db, 'children', childId));
        
        if (!childDoc.exists()) {
          setError('Child not found');
          setLoading(false);
          return;
        }
        
        // Format the child data for the dashboard
        const data = childDoc.data();
        const formattedChild = {
          id: childDoc.id,
          name: data.name,
          birthDate: data.birthDate ? data.birthDate.toDate() : new Date(),
          ageGroup: data.ageGroup || '0-1'
        };
        
        setChildData(formattedChild);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching child data:', err);
        setError('Failed to load child data');
        setLoading(false);
      }
    }
    
    fetchChildData();
  }, [childId]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-700">Loading development dashboard...</h2>
        </div>
      </div>
    );
  }
  
  if (error || !childData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-medium text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Unable to load child data'}</p>
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb navigation */}
        <div className="flex items-center text-sm text-gray-500 mb-6">
          <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
          <span className="mx-2">/</span>
          <Link href={`/dashboard/children/${childId}`} className="hover:text-gray-700">{childData.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">Development</span>
        </div>
        
        {/* Main content */}
        <DevelopmentJourneyDashboard child={childData} />
      </div>
    </div>
  );
} 