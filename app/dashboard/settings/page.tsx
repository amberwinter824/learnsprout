'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, User, Bell, Shield, Moon, Smartphone, Calendar, Plus, Minus } from 'lucide-react';
import Link from 'next/link';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function UserSettingsPage() {
  const { currentUser, loading, updateUserProfile, updateUserPreferences } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Activity preferences state
  const [scheduleByDay, setScheduleByDay] = useState<{[key: string]: number}>({});

  const weekdays = [
    { id: 'monday', label: 'Mon' },
    { id: 'tuesday', label: 'Tue' },
    { id: 'wednesday', label: 'Wed' },
    { id: 'thursday', label: 'Thu' },
    { id: 'friday', label: 'Fri' },
    { id: 'saturday', label: 'Sat' },
    { id: 'sunday', label: 'Sun' }
  ];

  // Load user data when component mounts
  useEffect(() => {
    if (currentUser) {
      // Try to get name from displayName first, then from name field, then empty string
      setName(currentUser.displayName || currentUser.name || '');
      setEmail(currentUser.email || '');
      
      // Load preferences from localStorage
      const storedNotifications = localStorage.getItem('notifications-enabled');
      
      setNotificationsEnabled(storedNotifications !== 'false');
      
      // Load activity preferences from user data
      if (currentUser?.preferences?.activityPreferences) {
        const actPrefs = currentUser.preferences.activityPreferences;
        
        if (actPrefs.scheduleByDay) {
          setScheduleByDay(actPrefs.scheduleByDay);
        } else {
          initializeScheduleByDay();
        }
      } else {
        // Default values if no preferences exist
        initializeScheduleByDay();
      }
    }
  }, [currentUser]);

  // Initialize the scheduleByDay with default values
  const initializeScheduleByDay = () => {
    const defaultSchedule: {[key: string]: number} = {};
    weekdays.forEach(day => {
      defaultSchedule[day.id] = ['monday', 'wednesday', 'friday'].includes(day.id) ? 2 : 0;
    });
    setScheduleByDay(defaultSchedule);
  };

  // Adjust activity count for a specific day
  const adjustDayActivities = (dayId: string, change: number) => {
    setScheduleByDay(prev => {
      const current = prev[dayId] || 0;
      const newValue = Math.max(0, current + change);
      return { ...prev, [dayId]: newValue };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setSaveMessage('');
      
      // Check if user is authenticated
      if (!currentUser) {
        throw new Error('You must be logged in to update settings');
      }
      
      // Update user profile in Firebase Auth
      try {
        await updateUserProfile({
          displayName: name,
          photoURL: photoURL
        });
      } catch (authError) {
        console.error('Error updating user profile:', authError);
        // Continue with other updates even if auth update fails
      }
      
      // Check if schedule preferences are set
      const hasSchedulePreferences = Object.values(scheduleByDay).some(count => count > 0);
      
      // Update preferences using the auth context
      await updateUserPreferences({
        ...currentUser.preferences,
        activityPreferences: {
          ...currentUser.preferences?.activityPreferences,
          scheduleByDay
        }
      });
      
      // Update onboarding status if schedule preferences are set
      if (hasSchedulePreferences) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          onboardingCompleted: true,
          updatedAt: serverTimestamp()
        });
      }
      
      // Update local storage preferences
      localStorage.setItem('notifications-enabled', notificationsEnabled.toString());
      
      setSaveMessage('Settings saved successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage('Failed to update settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2 text-emerald-500" />
            Profile Information
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              disabled
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed. Contact support if you need to update your email.
            </p>
          </div>
          
          {/* Activity Preferences Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
              <Calendar className="h-5 w-5 mr-2 text-emerald-500" />
              Schedule Preferences
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Why set a schedule?</h4>
              <p className="text-sm text-gray-600">
                Setting your preferred number of activities per day helps us create personalized weekly plans that match your family's routine. This ensures you receive the right amount of activities when you're ready to engage with your child, making learning a natural part of your daily life.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Choose how many activities you'd like for each day
              </p>
              {weekdays.map(day => (
                <div key={day.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 w-24">{day.id.charAt(0).toUpperCase() + day.id.slice(1)}</span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => adjustDayActivities(day.id, -1)}
                      className="p-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-lg font-medium text-gray-700 w-6 text-center">
                      {scheduleByDay[day.id] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustDayActivities(day.id, 1)}
                      className="p-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-1">
                Customize how many activities you want to do each day
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
              <Bell className="h-5 w-5 mr-2 text-emerald-500" />
              Notifications
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Enable notifications</p>
                <p className="text-xs text-gray-500">Receive updates about your child's activities</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled}
                  onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
              <Shield className="h-5 w-5 mr-2 text-emerald-500" />
              Security
            </h3>
            
            <div>
              <Link 
                href="/reset-password" 
                className="text-sm text-emerald-600 hover:text-emerald-500"
              >
                Change password
              </Link>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
              <Smartphone className="h-5 w-5 mr-2 text-emerald-500" />
              App Settings
            </h3>
            
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('pwa-banner-interacted');
                  localStorage.removeItem('pwa-installed');
                  window.location.reload();
                }}
                className="text-sm text-emerald-600 hover:text-emerald-500"
              >
                Show app installation prompt
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Reset the app installation banner if you previously dismissed it
              </p>
            </div>
            
            <div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all cached data? This will log you out.')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/login';
                  }
                }}
                className="text-sm text-red-600 hover:text-red-500"
              >
                Clear app data
              </button>
              <p className="text-xs text-gray-500 mt-1">
                This will clear all cached data and log you out
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-6">
            {saveMessage && (
              <p className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-emerald-600'}`}>
                {saveMessage}
              </p>
            )}
            
            <button
              type="submit"
              disabled={isSaving}
              className="ml-auto inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="-ml-1 mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}