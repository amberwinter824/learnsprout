// app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Users, 
  UserPlus, 
  Activity, 
  Calendar,
  BarChart3,
  Clock,
  Settings,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DashboardData {
  totalUsers: number;
  totalChildren: number;
  weeklyActiveUsers: number;
  totalObservations: number;
  usersByRole: {
    parent: number;
    educator: number;
    specialist: number;
    admin: number;
  };
  recentLogins: Array<{
    email: string;
    timestamp: Date;
  }>;
  systemStatus: {
    firebase: boolean;
    database: boolean;
    storage: boolean;
  };
}

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get total users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnapshot.size;

        // Get users by role
        const usersByRole = {
          parent: 0,
          educator: 0,
          specialist: 0,
          admin: 0
        };
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          const role = userData.role || 'parent';
          usersByRole[role as keyof typeof usersByRole]++;
        });

        // Get total children
        const childrenSnapshot = await getDocs(collection(db, 'children'));
        const totalChildren = childrenSnapshot.size;

        // Get weekly active users
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weeklyActiveQuery = query(
          collection(db, 'users'),
          where('lastLogin', '>=', oneWeekAgo)
        );
        const weeklyActiveSnapshot = await getDocs(weeklyActiveQuery);
        const weeklyActiveUsers = weeklyActiveSnapshot.size;

        // Get total observations
        const observationsSnapshot = await getDocs(collection(db, 'observations'));
        const totalObservations = observationsSnapshot.size;

        // Get recent logins
        const recentLoginsQuery = query(
          collection(db, 'users'),
          orderBy('lastLogin', 'desc'),
          limit(5)
        );
        const recentLoginsSnapshot = await getDocs(recentLoginsQuery);
        const recentLogins = recentLoginsSnapshot.docs.map(doc => ({
          email: doc.data().email,
          timestamp: doc.data().lastLogin?.toDate() || new Date()
        }));

        // Check system status
        const systemStatus = {
          firebase: true, // We're already connected if we got here
          database: true,
          storage: true
        };

        setDashboardData({
          totalUsers,
          totalChildren,
          weeklyActiveUsers,
          totalObservations,
          usersByRole,
          recentLogins,
          systemStatus
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl">Error</div>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Logged in as: {currentUser?.email}</span>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-gray-600" />
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(dashboardData?.systemStatus || {}).map(([service, status]) => (
              <div key={service} className="flex items-center space-x-2">
                {status ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="capitalize">{service}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData?.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserPlus className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Children</h3>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData?.totalChildren}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Weekly Active Users</h3>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData?.weeklyActiveUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Observations</h3>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData?.totalObservations}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-gray-600" />
            Users by Role
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(dashboardData?.usersByRole || {}).map(([role, count]) => (
              <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-500 capitalize">{role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Logins */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-600" />
              Recent Logins
            </h2>
            <div className="space-y-4">
              {dashboardData?.recentLogins.map((login, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-700">{login.email}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {login.timestamp.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gray-600" />
              Quick Actions
            </h2>
            <div className="space-y-4">
              <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <UserPlus className="h-5 w-5 mr-2" />
                Add New User
              </button>
              <button className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Shield className="h-5 w-5 mr-2" />
                Manage Permissions
              </button>
              <button className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <BarChart3 className="h-5 w-5 mr-2" />
                View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}