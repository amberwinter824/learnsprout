// app/components/OfflineNotifications.tsx
'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';

export default function OfflineNotifications() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showOfflineNotification, setShowOfflineNotification] = useState<boolean>(false);
  const [showOnlineNotification, setShowOnlineNotification] = useState<boolean>(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    
    // Define event handlers
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineNotification(true);
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowOnlineNotification(false);
      }, 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineNotification(true);
    };
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const dismissOfflineNotification = () => {
    setShowOfflineNotification(false);
  };
  
  const dismissOnlineNotification = () => {
    setShowOnlineNotification(false);
  };
  
  return (
    <>
      {/* Offline notification - persistent until dismissed */}
      {showOfflineNotification && !isOnline && (
        <div id="offline-notification" className="fixed bottom-4 right-4 bg-amber-50 text-amber-800 p-3 rounded-lg shadow-md border border-amber-200 max-w-xs z-50 animate-fade-in">
          <div className="flex items-start">
            <WifiOff className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium mb-1">You're offline</p>
              <p className="text-sm text-amber-700">
                Your changes will be saved and synced when you reconnect.
              </p>
            </div>
            <button 
              onClick={dismissOfflineNotification}
              className="ml-2 text-amber-700 hover:text-amber-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Online notification - auto-dismisses after 3 seconds */}
      {showOnlineNotification && isOnline && (
        <div id="online-notification" className="fixed bottom-4 right-4 bg-green-50 text-green-800 p-3 rounded-lg shadow-md border border-green-200 max-w-xs z-50 animate-fade-in">
          <div className="flex items-start">
            <Wifi className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium mb-1">You're back online</p>
              <p className="text-sm text-green-700">
                Syncing your data...
              </p>
            </div>
            <button 
              onClick={dismissOnlineNotification}
              className="ml-2 text-green-700 hover:text-green-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Persistent offline indicator in footer */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white py-1 px-4 text-center text-sm z-40">
          <div className="flex items-center justify-center">
            <WifiOff className="h-3 w-3 mr-1.5" />
            <span>Offline Mode</span>
          </div>
        </div>
      )}
    </>
  );
}