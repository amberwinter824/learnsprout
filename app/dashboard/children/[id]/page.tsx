"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayBirthDate } from '@/lib/dateUtils';
import { formatAge } from '@/lib/ageUtils';

// Component imports
import DailyActivitiesDashboard from '@/app/components/parent/DailyActivitiesDashboard';
import ObservationList from '@/app/components/ObservationList';
import WeekAtAGlanceView from '@/app/components/parent/WeekAtAGlanceView';
import QuickObservationForm from '@/app/components/parent/QuickObservationForm';
import ProgressiveSkillPath from '@/app/components/ProgressiveSkillPath';

// Icon imports
import { 
  Pencil, 
  Calendar, 
  BookOpen, 
  BarChart2, 
  Camera, 
  Users, 
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Star
} from 'lucide-react';

interface ChildDetailPageProps {
  params: {
    id: string;
  };
}

export default function ChildDetailPage({ params }: ChildDetailPageProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { id: childId } = params;
  
  // State
  const [child, setChild] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<{ id: string, title: string } | null>(null);
  const [showQuickObserve, setShowQuickObserve] = useState<boolean>(false);
  const [recentProgress, setRecentProgress] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'daily' | 'weekly'>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Load child data and recent progress
  useEffect(() => {
    const fetchChildData = async () => {
      if (!childId || !currentUser) return;
      
      try {
        // Fetch child document
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
        
        // Set child data with ID included
        setChild({
          id: childDoc.id,
          ...childData
        });
        
        // Fetch recent progress records
        const progressQuery = query(
          collection(db, 'progressRecords'),
          where('childId', '==', childId),
          orderBy('date', 'desc'),
          limit(5)
        );
        
        const progressSnapshot = await getDocs(progressQuery);
        const progressData = progressSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRecentProgress(progressData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching child data:', err);
        setError('Failed to load child information');
        setLoading(false);
      }
    };
    
    fetchChildData();
  }, [childId, currentUser]);
  
  // Handlers
  const handleActivitySelect = (activityId: string, activityTitle: string) => {
    setSelectedActivity({ id: activityId, title: activityTitle });
    setShowQuickObserve(true);
  };
  
  const handleObservationSuccess = () => {
    setShowQuickObserve(false);
    setSelectedActivity(null);
  };
  
  const handleViewWeekly = () => {
    setActiveView('weekly');
  };
  
  const handleViewDaily = () => {
    setActiveView('daily');
  };
  
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    
    if (activeView === 'weekly') {
      setActiveView('daily');
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg flex items-start text-red-800 max-w-3xl mx-auto my-6">
        <AlertCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }
  
  // Date formatting helpers
  const formattedBirthdate = child.birthDate || child.birthDateString 
    ? getDisplayBirthDate(child) 
    : 'Birth date not set';
  
  const childAge = child.birthDate || child.birthDateString
    ? formatAge(child.birthDate || new Date(child.birthDateString))
    : '';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Child Profile Header */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-5 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{child.name}</h1>
            <p className="mt-1 text-sm text-gray-500 flex flex-wrap items-center gap-x-4">
              <span>{formattedBirthdate}</span>
              {childAge && <span>{childAge}</span>}
              
              {child.ageGroup && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Age group: {child.ageGroup}
                </span>
              )}
            </p>
          </div>
          
          <Link
            href={`/dashboard/children/${childId}/edit`}
            className="mt-2 sm:mt-0 inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit Profile
          </Link>
        </div>
        
        {/* Interests and Notes */}
        {(child.interests?.length > 0 || child.notes) && (
          <div className="border-t border-gray-200 px-6 py-4">
            {child.interests?.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {child.interests.map((interest: string) => (
                    <span 
                      key={interest} 
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {child.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                <p className="text-sm text-gray-600">{child.notes}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Quick Links */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link 
              href={`/dashboard/children/${childId}/activities`}
              className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="h-6 w-6 text-emerald-500 mb-1" />
              <span className="text-sm font-medium">Activities</span>
            </Link>
            
            <Link 
              href={`/dashboard/children/${childId}/progress`}
              className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <BarChart2 className="h-6 w-6 text-emerald-500 mb-1" />
              <span className="text-sm font-medium">Progress</span>
            </Link>
            
            <Link 
              href={`/dashboard/children/${childId}/observations`}
              className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Camera className="h-6 w-6 text-emerald-500 mb-1" />
              <span className="text-sm font-medium">Observations</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Activity Form (if shown) */}
      {showQuickObserve && selectedActivity && (
        <div className="mb-6">
          <QuickObservationForm
            activityId={selectedActivity.id}
            childId={childId}
            activityTitle={selectedActivity.title}
            onSuccess={handleObservationSuccess}
            onClose={() => setShowQuickObserve(false)}
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Toggle for Daily/Weekly View */}
          <div className="bg-white shadow rounded-lg overflow-hidden p-4 flex space-x-2">
            <button
              onClick={handleViewDaily}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                activeView === 'daily' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Daily View
            </button>
            <button
              onClick={handleViewWeekly}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                activeView === 'weekly' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Weekly View
            </button>
          </div>
          
          {/* Activities View (Daily or Weekly) */}
          {activeView === 'daily' ? (
            <div>
              <DailyActivitiesDashboard 
                childId={childId} 
                childName={child.name}
                userId={currentUser?.uid || ''}
                selectedDate={selectedDate}
                onWeeklyViewRequest={handleViewWeekly}
              />
            </div>
          ) : (
            <WeekAtAGlanceView
              childId={childId}
              childName={child.name}
              onSelectDay={handleDateChange}
              onBackToDaily={handleViewDaily}
            />
          )}

          {/* Recent Observations - shown on larger screens as a list */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Observations</h2>
              <Link
                href={`/dashboard/children/${childId}/observations`}
                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center"
              >
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="p-6">
              <ObservationList 
                childId={childId}
                limit={3}
                showFilters={false}
              />
            </div>
          </div>
        </div>
        
        {/* Sidebar - 1/3 width on large screens */}
        <div className="space-y-6">
          {/* School Connection */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center">
              <Star className="h-5 w-5 text-indigo-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">School Connection</h2>
            </div>
            <div className="p-6">
              {child.associatedInstitutions?.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    {child.name} is connected to the following institutions:
                  </p>
                  <ul className="space-y-2">
                    {child.associatedInstitutions.map((institution: string) => (
                      <li key={institution} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {institution}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 mb-4">Not connected to any educational institutions</p>
                  <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200">
                    Connect with School
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Skills Progress - Full width */}
      <div className="mt-6">
        <ProgressiveSkillPath 
          childId={childId} 
          ageGroup={child.ageGroup} 
        />
      </div>
    </div>
  );
}