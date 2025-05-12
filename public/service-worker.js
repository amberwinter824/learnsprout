// public/service-worker.js

const CACHE_NAME = 'learn-sprout-v1';
const STATIC_ASSETS = [
  '/favicon.ico',
  '/manifest.json'
];

// Static assets to cache immediately during installation
const ACTIVITY_CACHE_NAME = 'learn-sprout-activities-v1';
const API_CACHE_NAME = 'learn-sprout-api-v1';

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return Promise.all(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => console.warn(`Failed to cache ${url}: ${err}`))
          )
        );
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Helper function to check if a request is for our domain
const isOurDomain = (url) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'app.learn-sprout.com' || 
           parsedUrl.hostname === 'learnsprout.vercel.app' ||
           parsedUrl.hostname === 'localhost';
  } catch (e) {
    return false;
  }
};

// Helper function to determine if a request is for an asset that should always be cached
const isAssetRequest = (url) => {
  const parsedUrl = new URL(url);
  const path = parsedUrl.pathname;
  return path.startsWith('/icons/') || 
         path.startsWith('/splash/') || 
         path === '/manifest.json' ||
         path.endsWith('.css') || 
         path.endsWith('.js') ||
         path.endsWith('.png') || 
         path.endsWith('.jpg') || 
         path.endsWith('.svg') ||
         path.endsWith('.ico');
};

// Helper function to check if a request is for an API endpoint
const isApiRequest = (url) => {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname.startsWith('/api/');
};

// Helper function to check if a request is for an activity
const isActivityRequest = (url) => {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname.startsWith('/activities/');
};

// Helper function to check if a request is for an allowed domain
const isAllowedDomain = (url) => {
  const allowedDomains = [
    'app.learn-sprout.com',
    'learnsprout.vercel.app',
    'localhost:3000'
  ];
  try {
    const parsedUrl = new URL(url);
    return allowedDomains.some(domain => parsedUrl.hostname === domain);
  } catch (e) {
    return false;
  }
};

// Fetch event - simple network-first strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests unless they're from our domain
  if (!isOurDomain(event.request.url)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Don't cache redirects or error responses
        if (response.redirected || response.status !== 200) {
          return response;
        }

        // Clone the response before caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If not in cache, return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Push notification received, but push notifications are disabled');
  // To enable push notifications:
  // 1. Generate VAPID keys using the 'web-push' npm package
  // 2. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to your environment variables
  // 3. Update the serviceWorkerRegistration.ts file
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  console.log('Notification click received, but push notifications are disabled');
  event.notification.close();
});

// Background sync for offline submissions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-observations') {
    event.waitUntil(syncObservations());
  }
});

// Function to sync offline observations
async function syncObservations() {
  try {
    // Get all pending observations from IndexedDB
    const db = await openObservationsDB();
    const observations = await getAllPendingObservations(db);
    
    // Process each observation
    for (const observation of observations) {
      try {
        // Try to send to server
        const response = await fetch('/api/observations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(observation)
        });
        
        // If successful, mark as synced in DB
        if (response.ok) {
          await markObservationAsSynced(db, observation.id);
        }
      } catch (error) {
        console.error('Failed to sync observation:', error);
        // Will retry on next sync event
      }
    }
  } catch (error) {
    console.error('Sync process failed:', error);
  }
}

// IndexedDB helpers for offline observations
function openObservationsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LearnSproutObservations', 1);
    
    request.onerror = event => {
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      const objectStore = db.createObjectStore('observations', { keyPath: 'id' });
      objectStore.createIndex('synced', 'synced', { unique: false });
    };
  });
}

function getAllPendingObservations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['observations'], 'readonly');
    const objectStore = transaction.objectStore('observations');
    const index = objectStore.index('synced');
    const request = index.getAll(0); // 0 = not synced
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onerror = event => {
      reject('Error getting pending observations');
    };
  });
}

function markObservationAsSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['observations'], 'readwrite');
    const objectStore = transaction.objectStore('observations');
    const request = objectStore.get(id);
    
    request.onsuccess = event => {
      const observation = event.target.result;
      observation.synced = 1;
      
      const updateRequest = objectStore.put(observation);
      updateRequest.onsuccess = () => {
        resolve();
      };
      updateRequest.onerror = () => {
        reject('Error updating observation sync status');
      };
    };
    
    request.onerror = () => {
      reject('Error getting observation to update');
    };
  });
}