// lib/serviceWorkerRegistration.ts

interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: SyncManager;
}

export function registerServiceWorker() {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/',
          });
          
          console.log('ServiceWorker registration successful with scope:', registration.scope);
          
          // Set up periodic sync if supported
          if ('periodicSync' in registration) {
            try {
              const status = await navigator.permissions.query({
                name: 'periodic-background-sync' as any,
              });
              
              if (status.state === 'granted') {
                await (registration as any).periodicSync.register('sync-activities', {
                  minInterval: 24 * 60 * 60 * 1000, // 24 hours
                });
                console.log('Periodic background sync registered!');
              }
            } catch (error) {
              console.error('Periodic background sync could not be registered:', error);
            }
          }
          
          // Set up push notifications if supported
          if ('pushManager' in registration) {
            try {
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''),
              });
              
              // Send the subscription to your server
              await sendPushSubscriptionToServer(subscription);
              console.log('Push subscription registered!');
            } catch (error) {
              console.error('Push subscription failed:', error);
            }
          }
        } catch (error) {
          console.error('ServiceWorker registration failed:', error);
        }
      });
  
      // Add offline/online event handlers
      window.addEventListener('online', () => {
        console.log('App is online. Syncing data...');
        // Trigger background sync if supported
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(registration => {
            (registration as ServiceWorkerRegistrationWithSync).sync.register('sync-observations');
          });
        }
      });
  
      window.addEventListener('offline', () => {
        console.log('App is offline. Data will be saved locally and synced when online.');
        // Optionally show an offline notification to user
        if (document.getElementById('offline-notification')) {
          document.getElementById('offline-notification')!.classList.remove('hidden');
        }
      });
    }
  }
  
  // Helper functions
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  async function sendPushSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
    } catch (error) {
      console.error('Error sending push subscription to server:', error);
    }
  }
  
  // Check if service worker is registered and update it if needed
  export async function updateServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        console.log('Service Worker updated');
      } catch (error) {
        console.error('Service Worker update failed:', error);
      }
    }
  }
  
  // Unregister service worker (useful for development)
  export async function unregisterServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const result = await registration.unregister();
        
        if (result) {
          console.log('Service Worker unregistered successfully');
        } else {
          console.log('Service Worker not unregistered');
        }
      } catch (error) {
        console.error('Service Worker unregister failed:', error);
      }
    }
  }
  
  // Function to request notification permission
  export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }