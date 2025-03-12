// public/register-sw.js

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope:', registration.scope);
        
        // Only attempt to subscribe to push after service worker is active
        if (registration.active) {
          setupPushSubscription(registration);
        } else {
          // If not active yet, wait for it to activate
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                setupPushSubscription(registration);
              }
            });
          });
        }
      })
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
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