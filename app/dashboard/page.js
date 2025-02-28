"use client"
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserChildren } from '@/lib/dataService';
import { Users, BookOpen, BarChart2, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChildren() {
      if (currentUser?.uid) {
        try {
          const childrenData = await getUserChildren(currentUser.uid);
          setChildren(childrenData);
        } catch (error) {
          console.error('Error fetching children:', error);
        } finally {
          setLoading(false);
        }
      }
    }

    fetchChildren();
  }, [currentUser]);

  const dashboardCards = [
    {
      title: 'Child Profiles',
      description: 'Manage your children\'s profiles',
      icon: Users,
      href: '/dashboard/children',
      color: 'bg-blue-500',
      count: children.length
    },
    {
      title: 'Weekly Activities',
      description: 'Plan and manage weekly activities',
      icon: Calendar,
      href: '/dashboard/activities',
      color: 'bg-emerald-500',
      count: '0' // This would need to be dynamically calculated
    },
    {
      title: 'Activity Library',
      description: 'Browse all available activities',
      icon: BookOpen,
      href: '/dashboard/activities/library',
      color: 'bg-indigo-500',
      count: '0' // This would need to be dynamically calculated
    },
    {
      title: 'Progress Tracking',
      description: 'Track development and milestones',
      icon: BarChart2,
      href: '/dashboard/progress',
      color: 'bg-amber-500',
      count: '0' // This would need to be dynamically calculated
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {currentUser ? `Welcome, ${currentUser.name || 'User'}` : 'Welcome to Learn Sprout'}
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Your personalized Learn Sproutschool platform
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {dashboardCards.map((card) => (
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

          {children.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Get Started</h2>
              <p className="text-gray-600 mb-4">
                Add your first child to begin your Learn Sproutschool journey.
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
                            {child.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{child.name}</div>
                            <div className="text-sm text-gray-500">
                              {child.birthDate && new Date(child.birthDate.seconds * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {child.ageGroup || 'Age group not set'}
                          </span>
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