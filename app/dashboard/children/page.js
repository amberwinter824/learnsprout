"use client"
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserChildren } from '@/lib/dataService';
import { Plus, Search } from 'lucide-react';

export default function ChildrenPage() {
  const { currentUser } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredChildren = children.filter(child => 
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatBirthDate = (timestamp) => {
    if (!timestamp) return 'No birth date';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Child Profiles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your children's profiles and track their progress
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/dashboard/children/add"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Child
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md"
                placeholder="Search children..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : filteredChildren.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredChildren.map((child) => (
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
                          Birth Date: {formatBirthDate(child.birthDate)}
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
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? "No children found matching your search." : "No children added yet."}
            </p>
            {!searchTerm && (
              <div className="mt-4">
                <Link
                  href="/dashboard/children/add"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Add Your First Child
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}