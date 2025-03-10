// app/components/parent/ImprovedParentDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DailyActivitiesDashboard from '@/app/components/parent/DailyActivitiesDashboard';
import { getUserChildren } from '@/lib/dataService';
import { 
  Loader2, 
  PlusCircle, 
  User, 
  Calendar, 
  BarChart, 
  BookOpen, 
  ChevronRight, 
  Lightbulb 
} from 'lucide-react';

export default function ImprovedParentDashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  // State
  const [children, setChildren] = useState<any[]>([]);
  const [activeChild, setActiveChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch children on load
  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const userChildren = await getUserChildren(currentUser.uid);
        
        setChildren(userChildren);
        
        // Set first child as active if there is one
        if (userChildren.length > 0) {
          setActiveChild(userChildren[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching children:', error);
        setLoading(false);
      }
    };
    
    fetchChildren();
  }, [currentUser]);
  
  // Change active child
  const changeActiveChild = (child: any) => {
    setActiveChild(child);
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-6">
          {/* Children selection */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Your Children</h2>
            {children.length > 0 ? (
              <div className="space-y-2">
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => changeActiveChild(child)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center ${
                      activeChild?.id === child.id 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <User className="h-5 w-5 mr-2 text-gray-500" />
                    <span>{child.name}</span>
                  </button>
                ))}
                
                <Link 
                  href="/dashboard/add-child"
                  className="w-full text-left px-3 py-2 rounded-lg flex items-center text-emerald-600 hover:bg-emerald-50"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  <span>Add Child</span>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">You haven't added any children yet.</p>
                <Link 
                  href="/dashboard/add-child"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Child
                </Link>
              </div>
            )}
          </div>
          
          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Quick Links</h2>
            <nav className="space-y-1">
              <Link 
                href="/dashboard/activities"
                className="block px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center"
              >
                <BookOpen className="h-4 w-4 mr-2 text-gray-500" />
                Activity Library
                <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
              </Link>
              <Link 
                href="/dashboard/progress"
                className="block px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center"
              >
                <BarChart className="h-4 w-4 mr-2 text-gray-500" />
                Progress Tracking
                <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
              </Link>
              <Link 
                href="/dashboard/resources"
                className="block px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center"
              >
                <BookOpen className="h-4 w-4 mr-2 text-gray-500" />
                Montessori Resources
                <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
              </Link>
            </nav>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="flex-1 w-full">
          {activeChild ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeChild.name}'s Dashboard
                </h1>
                
                <Link 
                  href={`/dashboard/children/${activeChild.id}/weekly-plan`}
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  View Weekly Plan
                </Link>
              </div>
              
              {/* Daily activities view - Always shown by default */}
              <DailyActivitiesDashboard 
                childId={activeChild.id} 
                childName={activeChild.name}
                userId={currentUser?.uid || ''}
              />
              
              {/* Additional dashboard widgets */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recent observations widget */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span>Recent Observations</span>
                    <Link 
                      href={`/dashboard/children/${activeChild.id}/observations`}
                      className="ml-auto text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      View All
                    </Link>
                  </h2>
                  <div className="text-gray-500 text-center py-8">
                    <p>Recent observations will appear here</p>
                    <p className="text-xs mt-2">Complete activities to see observations</p>
                  </div>
                </div>
                
                {/* Developmental progress widget */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span>Developmental Progress</span>
                    <Link 
                      href={`/dashboard/children/${activeChild.id}/progress`}
                      className="ml-auto text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      View Details
                    </Link>
                  </h2>
                  <div className="text-gray-500 text-center py-8">
                    <p>Skill development progress will appear here</p>
                    <p className="text-xs mt-2">Track progress as you complete activities</p>
                  </div>
                </div>
              </div>
              
              {/* Weekly Planning Card */}
              <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Weekly Activity Planning</h3>
                  <span className="text-xs text-gray-500">Optional Feature</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  Need structure for the week? Our system can auto-generate a balanced weekly plan of age-appropriate activities.
                </p>
                
                <Link 
                  href={`/dashboard/children/${activeChild.id}/weekly-plan`}
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center"
                >
                  <Lightbulb className="h-4 w-4 mr-1" />
                  View or Generate Weekly Plan
                </Link>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Learn Sprout</h1>
              <p className="text-gray-600 mb-6">
                Let's get started by adding your child's profile to create a personalized learning experience.
              </p>
              <Link 
                href="/dashboard/add-child"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Child
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}