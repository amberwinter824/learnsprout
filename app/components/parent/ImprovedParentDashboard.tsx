// app/components/parent/ImprovedParentDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
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
  Bell,
  MessageSquare,
  Book
} from 'lucide-react';
import Link from 'next/link';
import ChildCard from './ChildCard';
import WeekAtAGlanceView from './WeekAtAGlanceView';
import QuickObservationForm from '../QuickObservationForm';

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
                  href="/dashboard/calendar"
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
            {selectedChild ? (
              <WeekAtAGlanceView 
                childId={selectedChild.id} 
                childName={selectedChild.name}
                onSelectDay={(date) => router.push(`/dashboard/children/${selectedChild.id}/day/${date}`)}
                onBackToDaily={() => router.push(`/dashboard/children/${selectedChild.id}`)}
              />
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