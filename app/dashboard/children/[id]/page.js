"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChild, updateChild, deleteChild } from '@/lib/dataService';
import { ArrowLeft, Edit, Trash2, Calendar, BarChart2, BookOpen } from 'lucide-react';

export default function ChildDetailPage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchChild() {
      try {
        const childData = await getChild(id);
        if (childData) {
          setChild(childData);
        } else {
          setError('Child not found');
        }
      } catch (error) {
        setError('Error fetching child: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchChild();
    }
  }, [id]);

  const handleDelete = async () => {
    try {
      await deleteChild(id);
      router.push('/dashboard/children');
    } catch (error) {
      setError('Failed to delete child: ' + error.message);
    }
  };

  const formatBirthDate = (timestamp) => {
    if (!timestamp) return 'Not provided';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Unknown';
    
    const birthDateTime = new Date(birthDate.seconds * 1000);
    const now = new Date();
    
    let years = now.getFullYear() - birthDateTime.getFullYear();
    let months = now.getMonth() - birthDateTime.getMonth();
    
    if (months < 0 || (months === 0 && now.getDate() < birthDateTime.getDate())) {
      years--;
      months += 12;
    }
    
    return `${years} years, ${months} months`;
  };

  const actionCards = [
    {
      title: 'Weekly Plan',
      description: 'Schedule activities for this week',
      icon: Calendar,
      href: `/dashboard/children/${id}/weekly-plan`,
      color: 'bg-blue-100 text-blue-500'
    },
    {
      title: 'View Activities',
      description: 'See all assigned activities',
      icon: BookOpen,
      href: `/dashboard/children/${id}/activities`,
      color: 'bg-emerald-100 text-emerald-500'
    },
    {
      title: 'Track Progress',
      description: 'Record observations and milestones',
      icon: BarChart2,
      href: `/dashboard/children/${id}/progress`,
      color: 'bg-amber-100 text-amber-500'
    }
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
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

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/children" className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Children
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{child.name}</h1>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Birth Date</p>
                <p className="mt-1">{formatBirthDate(child.birthDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Age</p>
                <p className="mt-1">{calculateAge(child.birthDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Age Group</p>
                <p className="mt-1">{child.ageGroup}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Interests</p>
                <p className="mt-1">{child.interests?.join(', ') || 'None specified'}</p>
              </div>
              {child.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="mt-1">{child.notes}</p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Link
                href={`/dashboard/children/${id}/edit`}
                className="p-2 text-gray-400 hover:text-emerald-500"
              >
                <Edit className="h-5 w-5" />
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {actionCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="block p-6 bg-white shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-3 rounded-lg ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium">{card.title}</h3>
            <p className="mt-1 text-gray-600">{card.description}</p>
          </Link>
        ))}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900">Delete Child</h3>
            <p className="mt-2 text-gray-500">
              Are you sure you want to delete {child.name}? This action cannot be undone.
            </p>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
        