"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserChildren, getAllActivities } from '@/lib/dataService';
import { Users, BookOpen, BarChart2, Calendar } from 'lucide-react';

interface Child {
  id: string;
  name?: string;
  birthDate?: any;
  birthDateString?: string;
  ageGroup?: string;
  interests?: string[];
  notes?: string;
  active?: boolean;
  parentId?: string;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  color: string;
  count: number | string;
}

export default function Dashboard() {
  console.log("Dashboard component mounting");
  const { currentUser, loading: authLoading } = useAuth();
  console.log("Dashboard auth state:", currentUser ? "Logged in" : "Not logged in", "Auth loading:", authLoading);
  
  const [children, setChildren] = useState<Child[]>([]);
  const [activityCount, setActivityCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataFetchAttempted, setDataFetchAttempted] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData() {
      if (currentUser?.uid) {
        console.log("Dashboard: Fetching data for user", currentUser.uid);
        try {
          setLoading(true);
          
          // Fetch children data
          const childrenData = await getUserChildren(currentUser.uid);
          console.log("Dashboard: Fetched children data", childrenData.length);
          
          setChildren(childrenData.map(child => ({
            ...child,
            id: child.id || '' // Ensure id is always a string
          })));
          
          // Fetch activities count
          try {
            const activities = await getAllActivities();
            setActivityCount(activities?.length || 0);
            console.log("Dashboard: Fetched activities", activities?.length || 0);
          } catch (err) {
            console.error('Error fetching activities:', err);
            setActivityCount(0);
          }
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          setLoading(false);
          setDataFetchAttempted(true);
        }
      } else if (!authLoading) {
        // If authentication check is complete and there's no user, stop loading
        console.log("Dashboard: No user available and auth not loading");
        setLoading(false);
        setDataFetchAttempted(true);
      }
    }

    fetchData();
  }, [currentUser, authLoading]);

  const getDashboardCards = (): DashboardCard[] => {
    return [
      {
        title: 'Child Profiles',
        description: 'Manage your children\'s profiles',
        icon: Users,
        href: '/dashboard/children',
        color: 'bg-blue-500',
        count: children.length
      },
      {
        title: 'Activity Library',
        description: 'Browse all available activities',
        icon: BookOpen,
        href: '/dashboard/activities',
        color: 'bg-indigo-500',
        count: activityCount
      },
      {
        title: 'Progress Reports',
        description: 'Track overall development progress',
        icon: BarChart2,
        href: children.length > 0 ? `/dashboard/progress` : '/dashboard/children',
        color: 'bg-amber-500',
        count: 'View'
      }
    ];
  };

  // Show redirect prompt if not authenticated and not loading
  if (!currentUser && !authLoading && dataFetchAttempted) {
    console.log("Dashboard: Showing unauthenticated state");
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">You need to be logged in to view this dashboard.</p>
        <Link 
          href="/login" 
          className="inline-block bg-emerald-500 text-white px-4 py-2 rounded-md font-medium hover:bg-emerald-600 transition-colors"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {currentUser ? `Welcome, ${currentUser.name || currentUser.displayName || 'User'}` : 'Welcome to Learn Sprout'}
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Your personalized early childhood development platform
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {getDashboardCards().map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${card.color}`}>
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-2xl font-semibold text-gray-700">{card.count}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Weekly Plans Section */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Weekly Plans</h3>
            </div>
            {children.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">Add a child to create weekly plans</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {children.map((child) => (
                  <li key={child.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-medium">
                          {child.name ? child.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">{child.name || 'Child'}</span>
                      </div>
                      <Link
                        href={`/dashboard/children/${child.id}/weekly-plan`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Calendar className="mr-1 h-3.5 w-3.5" />
                        View Weekly Plan
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {children.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Get Started</h2>
              <p className="text-gray-600 mb-4">
                Add your first child to begin your journey.
              </p>
              <Link
                href="/dashboard/children/add"
                className="inline-block bg-emerald-500 text-white px-4 py-2 rounded-md font-medium hover:bg-emerald-600 transition-colors"
              >
                Add Child Profile
              </Link>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Your Children</h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {children.map((child) => (
                  <li key={child.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <Link href={`/dashboard/children/${child.id}`} className="block">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-medium">
                            {child.name ? child.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{child.name || 'Child'}</div>
                            <div className="text-sm text-gray-500">
                              {child.ageGroup || 'Age group not set'}
                            </div>
                          </div>
                        </div>
                        <div>
                          <svg
                            className="h-5 w-5 text-gray-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
                <Link
                  href="/dashboard/children/add"
                  className="text-emerald-500 hover:text-emerald-600 font-medium"
                >
                  + Add Another Child
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}