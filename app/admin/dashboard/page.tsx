// app/admin/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { 
  Shield, 
  Users, 
  Building2, 
  Activity,
  Package,
  BookOpen,
  BarChart2
} from 'lucide-react';

interface SystemStatus {
  firebase: boolean;
  database: boolean;
  storage: boolean;
}

interface DashboardData {
  totalUsers: number;
  totalChildren: number;
  totalObservations: number;
  usersByRole: {
    [key: string]: number;
  };
  systemStatus: SystemStatus;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    totalUsers: 0,
    totalChildren: 0,
    totalObservations: 0,
    usersByRole: {},
    systemStatus: {
      firebase: true,
      database: true,
      storage: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch users data
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;
      const usersByRole: { [key: string]: number } = {};
      usersSnapshot.forEach(doc => {
        const role = doc.data().activeRole || 'unknown';
        usersByRole[role] = (usersByRole[role] || 0) + 1;
      });

      // Fetch children data
      const childrenSnapshot = await getDocs(collection(db, 'children'));
      const totalChildren = childrenSnapshot.size;

      // Fetch observations from progressRecords
      const progressRecordsQuery = query(collection(db, 'progressRecords'));
      const progressRecordsSnapshot = await getDocs(progressRecordsQuery);
      const totalObservations = progressRecordsSnapshot.size;

      setData({
        totalUsers,
        totalChildren,
        totalObservations,
        usersByRole,
        systemStatus: {
          firebase: true,
          database: true,
          storage: true
        }
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* System Status */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <Shield className="h-5 w-5 inline-block mr-2 text-blue-600" />
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Firebase</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  data.systemStatus.firebase ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data.systemStatus.firebase ? 'Operational' : 'Issue Detected'}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Database</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  data.systemStatus.database ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data.systemStatus.database ? 'Operational' : 'Issue Detected'}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Storage</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  data.systemStatus.storage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data.systemStatus.storage ? 'Operational' : 'Issue Detected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-12 w-12 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Building2 className="h-12 w-12 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Children</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalChildren}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="h-12 w-12 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Observations</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalObservations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BarChart2 className="h-12 w-12 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">User Roles</p>
                <p className="text-2xl font-semibold text-gray-900">{Object.keys(data.usersByRole).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Users by Role</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.usersByRole).map(([role, count]) => (
              <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}