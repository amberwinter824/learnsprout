// public/service-worker.js

const CACHE_NAME = 'learn-sprout-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard',
  '/dashboard/activities',
  '/globals.css',
  '/offline.html'
];

// Static assets to cache immediately during installation
const ACTIVITY_CACHE_NAME = 'learn-sprout-activities-v1';
const API_CACHE_NAME = 'learn-sprout-api-v1';

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  // Skip waiting - allow the new service worker to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Create other caches
        return Promise.all([
          caches.open(ACTIVITY_CACHE_NAME),
          caches.open(API_CACHE_NAME)
        ]);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  const currentCaches = [CACHE_NAME, ACTIVITY_CACHE_NAME, API_CACHE_NAME];
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
      })
      .then(cachesToDelete => {
        return Promise.all(cachesToDelete.map(cacheToDelete => {
          console.log('Service Worker: Clearing old cache', cacheToDelete);
          return caches.delete(cacheToDelete);
        }));
      })
      .then(() => self.clients.claim())
  );
});

// Helper function to determine if a request is for an API route
const isApiRequest = (url) => {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname.startsWith('/api/');
};

// Helper function to determine if a request is for an activity
const isActivityRequest = (url) => {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname.includes('/activities/');
};

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Special handling for different types of requests
  if (isApiRequest(request.url)) {
    // API requests: Network first, then cache
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
  } else if (isActivityRequest(request.url)) {
    // Activity requests: Cache first, then network
    event.respondWith(cacheFirstStrategy(request, ACTIVITY_CACHE_NAME));
  } else {
    // Other requests: Cache first with network fallback
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
  }
});

// Cache-first strategy: Try cache first, fallback to network
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    // Try to get from cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('Service Worker: Serving from cache', request.url);
      
      // Return cached response immediately, but update cache in background
      fetchAndUpdateCache(request, cache);
      return cachedResponse;
    }
    
    // If not in cache, fetch from network and cache
    return await fetchAndCache(request, cache);
  } catch (error) {
    console.error('Service Worker: Cache-first strategy failed', error);
    
    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    // For other requests, return error response
    return new Response('Network error happened', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network-first strategy: Try network first, fallback to cache
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    // Try to fetch from network
    const response = await fetchAndCache(request, cache);
    return response;
  } catch (error) {
    console.log('Service Worker: Network request failed, using cache', request.url);
    
    // If network fails, try to get from cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache and network failed, return appropriate error
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    return new Response('Network error happened', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Helper function to fetch and cache a request
async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  
  // Only cache valid responses
  if (response.status === 200) {
    // Clone the response since it can only be consumed once
    const responseToCache = response.clone();
    
    // Cache the response asynchronously
    cache.put(request, responseToCache);
    console.log('Service Worker: Caching new resource', request.url);
  }
  
  return response;
}

// Helper function to fetch and update cache in background
function fetchAndUpdateCache(request, cache) {
  fetch(request)
    .then(response => {
      if (response.status === 200) {
        // Update the cache with the new response
        cache.put(request, response);
        console.log('Service Worker: Updated cache for', request.url);
      }
    })
    .catch(error => {
      console.error('Service Worker: Background fetch failed', error);
    });
}

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Learn Sprout', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
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