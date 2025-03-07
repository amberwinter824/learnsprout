// components/RecentActivities.tsx
'use client';

import { useState, useEffect } from 'react';
import { getChildProgress, ProgressRecord } from '@/lib/progressTracking';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';

interface ActivityDetails {
  id: string;
  title: string;
  description?: string;
  area?: string;
  duration?: number;
}

interface ActivityWithDetails extends ProgressRecord {
  activityDetails: ActivityDetails;
}

interface RecentActivitiesProps {
  childId: string;
}

export default function RecentActivities({ childId }: RecentActivitiesProps) {
  const [activities, setActivities] = useState<ActivityWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        setLoading(true);
        // Get the child's progress records
        const progressRecords = await getChildProgress(childId);
        
        // Only show completed activities
        const completedRecords = progressRecords.filter(
          record => record.completionStatus === 'completed'
        );
        
        // Limit to most recent 5
        const recentRecords = completedRecords.slice(0, 5);
        
        // Get activity details for each record
        const activitiesWithDetails = await Promise.all(
          recentRecords.map(async (record) => {
            try {
              const activityRef = doc(db, 'activities', record.activityId);
              const activityDoc = await getDoc(activityRef);
              
              if (activityDoc.exists()) {
                return {
                  ...record,
                  activityDetails: {
                    id: activityDoc.id,
                    title: activityDoc.data().title || 'Untitled Activity',
                    description: activityDoc.data().description,
                    area: activityDoc.data().area,
                    duration: activityDoc.data().duration
                  }
                } as ActivityWithDetails;
              }
              
              return {
                ...record,
                activityDetails: { 
                  id: record.activityId,
                  title: 'Unknown Activity' 
                }
              } as ActivityWithDetails;
            } catch (err) {
              console.error('Error fetching activity details:', err);
              return {
                ...record,
                activityDetails: { 
                  id: record.activityId,
                  title: 'Unknown Activity' 
                }
              } as ActivityWithDetails;
            }
          })
        );
        
        setActivities(activitiesWithDetails);
      } catch (err) {
        console.error('Error fetching recent activities:', err);
        setError('Failed to load recent activities');
      } finally {
        setLoading(false);
      }
    };
    
    if (childId) {
      fetchRecentActivities();
    }
  }, [childId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="animate-spin h-5 w-5 text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">{error}</div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-gray-500 text-center p-4 italic">
        No recent activities. Record observations for activities to see them here.
      </div>
    );
  }

  function formatDate(timestamp: Date | Timestamp | undefined): string {
    if (!timestamp) return '';
    
    const date = timestamp instanceof Date 
      ? timestamp 
      : timestamp instanceof Timestamp 
        ? timestamp.toDate() 
        : new Date();
        
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return (
    <div className="space-y-4">
      {activities.map(activity => (
        <div 
          key={activity.id} 
          className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-gray-900">
              {activity.activityDetails.title}
            </h3>
            <span className="bg-green-50 text-green-700 px-2 py-0.5 text-xs rounded-full flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </span>
          </div>
          
          <div className="text-sm text-gray-500 mb-2 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formatDate(activity.date)}
          </div>
          
          {activity.notes && (
            <p className="text-sm text-gray-600 mt-2">{activity.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}