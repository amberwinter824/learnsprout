// app/pwaSetup.tsx
'use client';

import { useEffect } from 'react';
import { registerServiceWorker, updateServiceWorker } from '@/lib/serviceWorkerRegistration';
import offlineStorage from '@/lib/offlineStorage';

export default function PWASetup() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();
    
    // Set up online/offline event listeners
    const handleOnline = async () => {
      console.log('App is back online. Syncing data...');
      
      // Show notification
      if (document.getElementById('online-notification')) {
        const notification = document.getElementById('online-notification');
        notification!.classList.remove('hidden');
        
        // Hide after 3 seconds
        setTimeout(() => {
          notification!.classList.add('hidden');
        }, 3000);
      }
      
      // Process sync queue
      try {
        await offlineStorage.processSyncQueue();
      } catch (error) {
        console.error('Error syncing data:', error);
      }
    };
    
    const handleOffline = () => {
      console.log('App is offline. Will use cached data and queue changes.');
      
      // Show notification
      if (document.getElementById('offline-notification')) {
        const notification = document.getElementById('offline-notification');
        notification!.classList.remove('hidden');
        
        // Hide after 3 seconds
        setTimeout(() => {
          notification!.classList.add('hidden');
        }, 3000);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check if already offline when component mounts
    if (!navigator.onLine) {
      handleOffline();
    }
    
    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return null;
}