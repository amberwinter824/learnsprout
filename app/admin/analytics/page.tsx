'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { BarChart2, Users, Home, Activity, Calendar } from 'lucide-react';

interface Analytics {
  totalUsers: number;
  totalChildren: number;
  weeklyActiveUsers: number;
  totalObservations: number;
  recentLogins: Array<{
    email: string;
    timestamp: Date;
  }>;
  usersByRole: {
    [key: string]: number;
  };
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    totalChildren: 0,
    weeklyActiveUsers: 0,
    totalObservations: 0,
    recentLogins: [],
    usersByRole: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch total users and their roles
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;
      const usersByRole: { [key: string]: number } = {};
      usersSnapshot.forEach(doc => {
        const role = doc.data().activeRole || 'unknown';
        usersByRole[role] = (usersByRole[role] || 0) + 1;
      });

      // Fetch total children
      const childrenSnapshot = await getDocs(collection(db, 'children'));
      const totalChildren = childrenSnapshot.size;

      // Fetch weekly active users (users who logged in in the last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentLoginsQuery = query(
        collection(db, 'users'),
        where('lastLoginAt', '>=', weekAgo),
        orderBy('lastLoginAt', 'desc')
      );
      const recentLoginsSnapshot = await getDocs(recentLoginsQuery);
      const weeklyActiveUsers = recentLoginsSnapshot.size;

      // Fetch total observations (progressRecords)
      const progressRecordsQuery = query(collection(db, 'progressRecords'));
      const progressRecordsSnapshot = await getDocs(progressRecordsQuery);
      const totalObservations = progressRecordsSnapshot.size;

      // Get recent logins
      const recentLogins = recentLoginsSnapshot.docs
        .slice(0, 5)
        .map(doc => ({
          email: doc.data().email || 'Unknown',
          timestamp: doc.data().lastLoginAt?.toDate() || new Date()
        }));

      setAnalytics({
        totalUsers,
        totalChildren,
        weeklyActiveUsers,
        totalObservations,
        recentLogins,
        usersByRole
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
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
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <p className="text-2xl font-semibold">{analytics.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Home className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Children</h3>
              <p className="text-2xl font-semibold">{analytics.totalChildren}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Weekly Active Users</h3>
              <p className="text-2xl font-semibold">{analytics.weeklyActiveUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Observations</h3>
              <p className="text-2xl font-semibold">{analytics.totalObservations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users by Role Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Users by Role</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(analytics.usersByRole).map(([role, count]) => (
            <div key={role} className="text-center">
              <p className="text-sm text-gray-500 capitalize">{role}</p>
              <p className="text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Logins */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Logins</h2>
        <div className="space-y-4">
          {analytics.recentLogins.map((login, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-gray-600">{login.email}</span>
              <span className="text-sm text-gray-500">
                {login.timestamp.toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 