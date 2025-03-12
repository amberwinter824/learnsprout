// lib/offlineStorage.ts

/**
 * IndexedDB wrapper for offline storage
 * 
 * This module provides functions to interact with IndexedDB
 * for storing activities, observations, and other data offline
 */

// Database constants
const DB_NAME = 'LearnSproutOfflineDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  ACTIVITIES: 'activities',
  OBSERVATIONS: 'observations',
  WEEKLY_PLANS: 'weeklyPlans',
  USER_CHILDREN: 'userChildren',
  SYNC_QUEUE: 'syncQueue'
};

// Interface for sync queue items
interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retries: number;
  synced: boolean;
}

// Initialize the database
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      reject('Could not open IndexedDB');
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.ACTIVITIES)) {
        const activityStore = db.createObjectStore(STORES.ACTIVITIES, { keyPath: 'id' });
        activityStore.createIndex('childId', 'childId', { unique: false });
        activityStore.createIndex('area', 'area', { unique: false });
        activityStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.OBSERVATIONS)) {
        const observationStore = db.createObjectStore(STORES.OBSERVATIONS, { keyPath: 'id' });
        observationStore.createIndex('childId', 'childId', { unique: false });
        observationStore.createIndex('activityId', 'activityId', { unique: false });
        observationStore.createIndex('date', 'date', { unique: false });
        observationStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.WEEKLY_PLANS)) {
        const weeklyPlanStore = db.createObjectStore(STORES.WEEKLY_PLANS, { keyPath: 'id' });
        weeklyPlanStore.createIndex('childId', 'childId', { unique: false });
        weeklyPlanStore.createIndex('weekStarting', 'weekStarting', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.USER_CHILDREN)) {
        const childrenStore = db.createObjectStore(STORES.USER_CHILDREN, { keyPath: 'id' });
        childrenStore.createIndex('userId', 'userId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        syncQueueStore.createIndex('action', 'action', { unique: false });
        syncQueueStore.createIndex('collection', 'collection', { unique: false });
        syncQueueStore.createIndex('synced', 'synced', { unique: false });
        syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Generic function to add an item to a store
async function addItem<T extends object>(storeName: string, item: T): Promise<string> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Add unique ID if not present
    if (!('id' in item as any)) {
      (item as any).id = generateUniqueId();
    }
    
    const request = store.add(item);
    
    request.onsuccess = () => {
      resolve((item as any).id);
    };
    
    request.onerror = (event) => {
      reject(`Error adding item to ${storeName}: ${event}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Generic function to get an item from a store
async function getItem<T>(storeName: string, id: string): Promise<T | null> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => {
      const result = request.result as T;
      resolve(result || null);
    };
    
    request.onerror = (event) => {
      reject(`Error getting item from ${storeName}: ${event}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Generic function to update an item in a store
async function updateItem<T>(storeName: string, id: string, item: Partial<T>): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // First get the existing item
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      if (!getRequest.result) {
        reject(`Item with id ${id} not found in ${storeName}`);
        return;
      }
      
      // Merge the existing item with the updates
      const updatedItem = { ...getRequest.result, ...item };
      
      // Update the item
      const updateRequest = store.put(updatedItem);
      
      updateRequest.onsuccess = () => {
        resolve();
      };
      
      updateRequest.onerror = (event) => {
        reject(`Error updating item in ${storeName}: ${event}`);
      };
    };
    
    getRequest.onerror = (event) => {
      reject(`Error getting item for update from ${storeName}: ${event}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Generic function to delete an item from a store
async function deleteItem(storeName: string, id: string): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = (event) => {
      reject(`Error deleting item from ${storeName}: ${event}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Generic function to get all items from a store
async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result as T[]);
    };
    
    request.onerror = (event) => {
      reject(`Error getting all items from ${storeName}: ${event}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Function to query items by an index
async function queryByIndex<T>(storeName: string, indexName: string, indexValue: any): Promise<T[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(indexValue);
    
    request.onsuccess = () => {
      resolve(request.result as T[]);
    };
    
    request.onerror = (event) => {
      reject(`Error querying items by index from ${storeName}: ${event}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Function to add an item to the sync queue
async function addToSyncQueue(collection: string, action: 'create' | 'update' | 'delete', data: any): Promise<string> {
  const syncItem: SyncQueueItem = {
    id: generateUniqueId(),
    collection,
    action,
    data,
    timestamp: Date.now(),
    retries: 0,
    synced: false
  };
  
  return addItem<SyncQueueItem>(STORES.SYNC_QUEUE, syncItem);
}

// Function to get all pending sync items
async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return queryByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, 'synced', false);
}

// Function to mark a sync item as synced
async function markAsSynced(id: string): Promise<void> {
  return updateItem<SyncQueueItem>(STORES.SYNC_QUEUE, id, { synced: true });
}

// Function to increment the retry count for a sync item
async function incrementSyncRetry(id: string): Promise<void> {
  const item = await getItem<SyncQueueItem>(STORES.SYNC_QUEUE, id);
  if (item) {
    return updateItem<SyncQueueItem>(STORES.SYNC_QUEUE, id, { retries: item.retries + 1 });
  }
}

// Helper function to generate a unique ID
function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ACTIVITY-SPECIFIC FUNCTIONS

// Function to save an activity to offline storage
export async function saveActivityOffline(activity: any): Promise<string> {
  // Ensure the activity has an updatedAt timestamp
  activity.updatedAt = Date.now();
  
  // Add to activities store
  const activityId = await addItem(STORES.ACTIVITIES, activity);
  
  // Add to sync queue for later synchronization
  await addToSyncQueue(STORES.ACTIVITIES, 'create', activity);
  
  return activityId;
}

// Function to get activities for a child
export async function getChildActivitiesOffline(childId: string): Promise<any[]> {
  return queryByIndex(STORES.ACTIVITIES, 'childId', childId);
}

// OBSERVATION-SPECIFIC FUNCTIONS

// Function to save an observation to offline storage
export async function saveObservationOffline(observation: any): Promise<string> {
  // Add synced flag
  observation.synced = false;
  
  // Add to observations store
  const observationId = await addItem(STORES.OBSERVATIONS, observation);
  
  // Add to sync queue for later synchronization
  await addToSyncQueue(STORES.OBSERVATIONS, 'create', observation);
  
  return observationId;
}

// Function to get observations for a child
export async function getChildObservationsOffline(childId: string): Promise<any[]> {
  return queryByIndex(STORES.OBSERVATIONS, 'childId', childId);
}

// Function to get observations for an activity
export async function getActivityObservationsOffline(activityId: string): Promise<any[]> {
  return queryByIndex(STORES.OBSERVATIONS, 'activityId', activityId);
}

// WEEKLY PLAN SPECIFIC FUNCTIONS

// Function to save a weekly plan to offline storage
export async function saveWeeklyPlanOffline(weeklyPlan: any): Promise<string> {
  // Add to weekly plans store
  const planId = await addItem(STORES.WEEKLY_PLANS, weeklyPlan);
  
  // Add to sync queue for later synchronization
  await addToSyncQueue(STORES.WEEKLY_PLANS, 'create', weeklyPlan);
  
  return planId;
}

// Function to get weekly plans for a child
export async function getChildWeeklyPlansOffline(childId: string): Promise<any[]> {
  return queryByIndex(STORES.WEEKLY_PLANS, 'childId', childId);
}

// USER CHILDREN SPECIFIC FUNCTIONS

// Function to save a child to offline storage
export async function saveChildOffline(child: any): Promise<string> {
  // Add to user children store
  const childId = await addItem(STORES.USER_CHILDREN, child);
  
  // Add to sync queue for later synchronization
  await addToSyncQueue(STORES.USER_CHILDREN, 'create', child);
  
  return childId;
}

// Function to get children for a user
export async function getUserChildrenOffline(userId: string): Promise<any[]> {
  return queryByIndex(STORES.USER_CHILDREN, 'userId', userId);
}

// SYNCHRONIZATION FUNCTIONS

// Function to process the sync queue when online
export async function processSyncQueue(): Promise<void> {
  const pendingItems = await getPendingSyncItems();
  
  for (const item of pendingItems) {
    try {
      // Determine the endpoint based on the collection
      const endpoint = `/api/${item.collection.toLowerCase()}`;
      
      // Determine the HTTP method based on the action
      let method = 'POST';
      if (item.action === 'update') method = 'PUT';
      if (item.action === 'delete') method = 'DELETE';
      
      // Send the request
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'DELETE' ? JSON.stringify(item.data) : undefined,
      });
      
      if (response.ok) {
        // Mark the item as synced
        await markAsSynced(item.id);
        
        // If it's an observation, also update the observations store
        if (item.collection === STORES.OBSERVATIONS) {
          await updateItem(STORES.OBSERVATIONS, item.data.id, { synced: true });
        }
      } else {
        // Increment retry count
        await incrementSyncRetry(item.id);
        console.error(`Error syncing item ${item.id} (${item.collection}): ${response.statusText}`);
      }
    } catch (error) {
      // Increment retry count
      await incrementSyncRetry(item.id);
      console.error(`Error processing sync item ${item.id} (${item.collection}):`, error);
    }
  }
}

// Function to clear all data from IndexedDB (useful for testing or logout)
export async function clearAllData(): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    // Close the database connection first
    db.close();
    
    // Delete the entire database
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    
    deleteRequest.onsuccess = () => {
      console.log('All offline data cleared');
      resolve();
    };
    
    deleteRequest.onerror = (event) => {
      reject(`Error clearing all data: ${event}`);
    };
  });
}

// Export functions for use in the app
export default {
  // Generic functions
  addItem,
  getItem,
  updateItem,
  deleteItem,
  getAllItems,
  queryByIndex,
  
  // Sync queue functions
  addToSyncQueue,
  getPendingSyncItems,
  markAsSynced,
  processSyncQueue,
  
  // Activity functions
  saveActivityOffline,
  getChildActivitiesOffline,
  
  // Observation functions
  saveObservationOffline,
  getChildObservationsOffline,
  getActivityObservationsOffline,
  
  // Weekly plan functions
  saveWeeklyPlanOffline,
  getChildWeeklyPlansOffline,
  
  // Child functions
  saveChildOffline,
  getUserChildrenOffline,
  
  // Utility functions
  clearAllData,
  
  // Constants
  STORES
};