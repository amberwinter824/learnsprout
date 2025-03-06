"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getChild, getUserChildren, ChildData } from '@/lib/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User,
  Calendar,
  Clock,
  BarChart,
  BookOpen,
  Edit,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import WeeklyPlanRecommendation from '@/components/WeeklyPlanRecommendation';
import ChildSkillProgress from '@/components/ChildSkillProgress';

interface Params {
  id: string;
}

export default function ChildProfilePage({ params }: { params: Params }) {
  const { id } = params;
  const router = useRouter();
  const { currentUser } = useAuth();
  const [child, setChild] = useState<ChildData | null>(null);
  const [siblings, setSiblings] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        if (!currentUser) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Fetch child data
        const childData = await getChild(id);
        if (!childData) {
          if (isMounted) {
            setError('Child not found');
            setLoading(false);
          }
          return;
        }
        
        if (isMounted) {
          setChild(childData);
        }

        // Fetch siblings (other children for this user)
        const allChildren = await getUserChildren(currentUser.uid);
        const siblingData = allChildren.filter(c => c.id !== id);
        
        if (isMounted) {
          setSiblings(siblingData);
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Error fetching child data:', error);
        if (isMounted) {
          setError(`Error fetching data: ${error.message}`);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [id, currentUser]);

  // Format date for display
  function formatDate(timestamp: any): string {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }

  // Calculate age
  function calculateAge(birthDate: any): string {
    if (!birthDate) return '';
    
    try {
      const dob = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      if (age < 5) {
        // For children under 5, show years and months
        const months = monthDiff < 0 ? 12 + monthDiff : monthDiff;
        return `${age} years, ${months} months`;
      }
      
      return `${age} years`;
    } catch (error) {
      console.error('Error calculating age:', error);
      return 'Unknown age';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin h-12 w-12 text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>{error}</p>
        <Link href="/dashboard/children" className="mt-4 inline-block text-red-700 underline">
          Back to Children
        </Link>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md">
        <p>No child found with this ID</p>
        <Link href="/dashboard/children" className="mt-4 inline-block text-yellow-700 underline">
          Back to Children
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/children" className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Children
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{child.name}'s Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Profile card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center">
            <User className="h-5 w-5 text-emerald-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Profile</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                <p className="mt-1 text-gray-900">{child.name}</p>
              </div>
              
              {child.birthDate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
                  <p className="mt-1 text-gray-900">{formatDate(child.birthDate)}</p>
                  <p className="text-sm text-gray-500">{calculateAge(child.birthDate)}</p>
                </div>
              )}
              
              {child.ageGroup && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Age Group</h3>
                  <p className="mt-1 text-gray-900">{child.ageGroup}</p>
                </div>
              )}
              
              {child.interests && child.interests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Interests</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {child.interests.map(interest => (
                      <span key={interest} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {child.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                  <p className="mt-1 text-gray-900 whitespace-pre-line">{child.notes}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <Link
                href={`/dashboard/children/${id}/edit`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <Edit className="-ml-0.5 mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
        
        {/* Weekly Plan Recommendation */}
        <div className="md:col-span-2">
          <WeeklyPlanRecommendation 
            childId={id} 
            childName={child.name} 
            userId={currentUser?.uid}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Child Skill Progress */}
        <ChildSkillProgress childId={id} />
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href={`/dashboard/children/${id}/weekly-plan`}
              className="inline-flex flex-col items-center px-4 py-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <Calendar className="mb-2 h-6 w-6 text-emerald-500" />
              <span>Weekly Plan</span>
            </Link>
            
            <Link
              href={`/dashboard/children/${id}/activities`}
              className="inline-flex flex-col items-center px-4 py-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <BookOpen className="mb-2 h-6 w-6 text-emerald-500" />
              <span>Activity Library</span>
            </Link>
            
            <Link
              href={`/dashboard/children/${id}/progress`}
              className="inline-flex flex-col items-center px-4 py-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <BarChart className="mb-2 h-6 w-6 text-emerald-500" />
              <span>Progress Reports</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Recent Activities */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Activities</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          <div className="p-6 text-center text-gray-500">
            <p>No recent activities recorded.</p>
            <p className="mt-2 text-sm">
              Complete activities from the weekly plan to see them here.
            </p>
          </div>
        </div>
      </div>
      
      {/* Siblings */}
      {siblings.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Siblings</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {siblings.map(sibling => (
              <Link
                key={sibling.id}
                href={`/dashboard/children/${sibling.id}`}
                className="block p-6 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{sibling.name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {sibling.ageGroup || calculateAge(sibling.birthDate)}
                    </p>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
