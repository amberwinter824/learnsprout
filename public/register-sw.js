// public/register-sw.js

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    // First, unregister any existing service workers
    navigator.serviceWorker.getRegistrations().then(registrations => {
      return Promise.all(registrations.map(registration => registration.unregister()));
    }).then(() => {
      // Then register the new service worker
      return navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none' // Ensure we always get the latest service worker
      });
    }).then(registration => {
      console.log('ServiceWorker registration successful with scope:', registration.scope);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, reload the page
            window.location.reload();
          }
        });
      });

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    }).catch(error => {
      console.error('ServiceWorker registration failed:', error);
      // If registration fails, ensure the service worker is unregistered
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    });
  }
});

// Separate function for push setup
function setupPushSubscription(registration) {
  // Only try to subscribe if push is supported
  if ('PushManager' in window) {
    console.log('Push is supported, attempting to subscribe...');
    // Add timeout to ensure service worker is fully active
    setTimeout(() => {
      try {
        // Your push subscription code here
        requestNotificationPermission();
      } catch (error) {
        console.error('Push subscription setup error:', error);
      }
    }, 1000);
  }
}

// Request notification permission (optional)
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
      }
    });
  }
}