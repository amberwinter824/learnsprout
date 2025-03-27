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
  Clock
} from 'lucide-react';

interface AnalyticsData {
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
}

export default function AdminAnalytics() {
  const { currentUser } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
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

        // Get weekly active users (users who logged in in the last 7 days)
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

        setAnalyticsData({
          totalUsers,
          totalChildren,
          weeklyActiveUsers,
          totalObservations,
          usersByRole,
          recentLogins
        });
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <p className="text-2xl font-semibold">{analyticsData?.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserPlus className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Children</h3>
              <p className="text-2xl font-semibold">{analyticsData?.totalChildren}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Weekly Active Users</h3>
              <p className="text-2xl font-semibold">{analyticsData?.weeklyActiveUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Observations</h3>
              <p className="text-2xl font-semibold">{analyticsData?.totalObservations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users by Role Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Users by Role</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(analyticsData?.usersByRole || {}).map(([role, count]) => (
            <div key={role} className="text-center">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-gray-500 capitalize">{role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Logins */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Logins</h2>
        <div className="space-y-4">
          {analyticsData?.recentLogins.map((login, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-700">{login.email}</span>
              </div>
              <span className="text-sm text-gray-500">
                {login.timestamp.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 