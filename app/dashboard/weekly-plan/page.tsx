'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format, startOfWeek, addDays } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function WeeklyPlanPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  // Fetch children and their weekly plans
  useEffect(() => {
    async function fetchData() {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch children
        const childrenQuery = query(
          collection(db, 'children'),
          where('parentId', '==', currentUser.uid)
        );
        
        const childrenSnapshot = await getDocs(childrenQuery);
        const childrenData = childrenSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setChildren(childrenData);
        
        // Fetch weekly plans for all children
        const childIds = childrenData.map(child => child.id);
        
        if (childIds.length > 0) {
          const plansQuery = query(
            collection(db, 'weeklyPlans'),
            where('childId', 'in', childIds)
          );
          
          const plansSnapshot = await getDocs(plansQuery);
          const plansData = plansSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setWeeklyPlans(plansData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    }
    
    fetchData();
  }, [currentUser]);
  
  // Generate the days of the week
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return {
      date: day,
      name: format(day, 'EEEE'),
      shortName: format(day, 'EEE')
    };
  });
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Weekly Planner</h1>
      
      <div className="mb-6">
        <label htmlFor="child-filter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Child
        </label>
        <select
          id="child-filter"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
          value={selectedChildId || ''}
          onChange={(e) => setSelectedChildId(e.target.value || null)}
        >
          <option value="">All Children</option>
          {children.map(child => (
            <option key={child.id} value={child.id}>{child.name}</option>
          ))}
        </select>
      </div>
      
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {weekDays.map((day) => (
            <div key={day.name} className="bg-gray-50 px-4 py-2">
              <p className="text-sm font-medium text-gray-900">{day.shortName}</p>
              <p className="text-xs text-gray-500">{format(day.date, 'MMM d')}</p>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-gray-200 min-h-[500px]">
          {weekDays.map((day, dayIndex) => (
            <div key={day.name} className="bg-white p-2 h-full">
              <div className="space-y-1">
                {weeklyPlans
                  .filter(plan => !selectedChildId || plan.childId === selectedChildId)
                  .map(plan => {
                    const dayKey = day.name.toLowerCase();
                    const activities = plan[dayKey] || [];
                    const child = children.find(c => c.id === plan.childId);
                    
                    return activities.map((activity: any, actIndex: number) => (
                      <div 
                        key={`${plan.id}-${dayKey}-${actIndex}`}
                        className="p-2 rounded-md text-xs bg-emerald-50 border border-emerald-100"
                      >
                        <div className="font-medium">{activity.activityTitle || 'Activity'}</div>
                        <div className="text-gray-500 capitalize">{activity.timeSlot}</div>
                        {!selectedChildId && child && (
                          <div className="mt-1 text-emerald-700 text-[10px]">{child.name}</div>
                        )}
                      </div>
                    ));
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 