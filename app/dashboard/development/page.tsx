'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import DevelopmentJourneyDashboard from '@/app/components/parent/DevelopmentJourneyDashboard';

interface Child {
  id: string;
  name: string;
  birthDate?: any;
  ageGroup?: string;
  active?: boolean;
}

export default function DevelopmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  
  const childIdParam = searchParams.get('childId');
  
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(childIdParam || undefined);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch children
  useEffect(() => {
    async function fetchChildren() {
      try {
        if (!currentUser?.uid) return;
        
        const childrenQuery = query(
          collection(db, 'children'),
          where('userId', '==', currentUser.uid),
          where('active', '==', true)
        );
        
        const snapshot = await getDocs(childrenQuery);
        const childrenData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Child[];
        
        setChildren(childrenData);
        
        // Auto-select first child if none selected and there are children
        if (!selectedChildId && childrenData.length > 0) {
          setSelectedChildId(childrenData[0].id);
          router.replace(`/dashboard/development?childId=${childrenData[0].id}`, { scroll: false });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching children:', err);
        setError('Failed to load children data');
        setLoading(false);
      }
    }
    
    fetchChildren();
  }, [currentUser, selectedChildId, router]);
  
  // Fetch selected child data
  useEffect(() => {
    async function fetchChildData() {
      if (!selectedChildId) return;
      
      try {
        const childDoc = await getDoc(doc(db, 'children', selectedChildId));
        
        if (!childDoc.exists()) {
          setError('Child not found');
          return;
        }
        
        const data = childDoc.data();
        const formattedChild = {
          id: childDoc.id,
          name: data.name,
          birthDate: data.birthDate ? data.birthDate.toDate() : new Date(),
          ageGroup: data.ageGroup || '0-1'
        };
        
        setSelectedChild(formattedChild);
      } catch (err) {
        console.error('Error fetching child data:', err);
        setError('Failed to load child data');
      }
    }
    
    fetchChildData();
  }, [selectedChildId]);
  
  // Handle child selection
  const handleChildSelect = (childId: string) => {
    setSelectedChildId(childId);
    router.replace(`/dashboard/development?childId=${childId}`, { scroll: false });
  };
  
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
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-medium text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
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
  
  if (children.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">No children found</h2>
        <p className="text-gray-600 mb-4">
          Add a child profile to begin tracking developmental progress.
        </p>
        <Link
          href="/dashboard/children/add"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
        >
          Add Child Profile
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Development Journey</h1>
          <p className="text-gray-600">
            Track your child's developmental progress through play and natural observation
          </p>
        </div>
        
        {/* Child selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="font-medium text-gray-900 mb-3">Select a child:</div>
          <div className="space-y-2">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => handleChildSelect(child.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border flex items-center justify-between ${
                  selectedChildId === child.id
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-medium">
                    {child.name.charAt(0)}
                  </div>
                  <span className="ml-3 font-medium">{child.name}</span>
                </div>
                <ChevronRight size={18} className={selectedChildId === child.id ? 'text-emerald-500' : 'text-gray-400'} />
              </button>
            ))}
          </div>
        </div>
        
        {/* Development Journey Dashboard */}
        {selectedChild && (
          <DevelopmentJourneyDashboard child={selectedChild} />
        )}
      </div>
    </div>
  );
} 