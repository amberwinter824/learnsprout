// lib/offlineStorage.ts

/**
 * Simplified IndexedDB wrapper for offline storage
 * 
 * This version handles errors gracefully and falls back to in-memory storage
 * when IndexedDB is not available
 */

// Store names
const STORES = {
  ACTIVITIES: 'activities',
  OBSERVATIONS: 'observations',
  WEEKLY_PLANS: 'weeklyPlans',
  USER_CHILDREN: 'userChildren',
  SYNC_QUEUE: 'syncQueue'
};

// In-memory fallback storage
const memoryStorage: {[key: string]: {[key: string]: any}} = {
  [STORES.ACTIVITIES]: {},
  [STORES.OBSERVATIONS]: {},
  [STORES.WEEKLY_PLANS]: {},
  [STORES.USER_CHILDREN]: {},
  [STORES.SYNC_QUEUE]: {}
};

// Check if IndexedDB is available
const isIndexedDBAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && 
           'indexedDB' in window && 
           window.indexedDB !== null;
  } catch (e) {
    console.warn('IndexedDB not available:', e);
    return false;
  }
};

// Generic function to get an item
async function getItem<T>(storeName: string, id: string): Promise<T | null> {
  try {
    // Skip IndexedDB operations during server-side rendering
    if (typeof window === 'undefined') {
      return null;
    }
    
    // Use in-memory fallback if IndexedDB is not available
    if (!isIndexedDBAvailable()) {
      return memoryStorage[storeName]?.[id] || null;
    }
    
    return null; // Simplified implementation - always return null for now
  } catch (error) {
    console.error(`Error retrieving ${storeName} item:`, error);
    return null;
  }
}

// Generic function to add an item
async function addItem<T>(storeName: string, item: any): Promise<string> {
  try {
    // Skip IndexedDB operations during server-side rendering
    if (typeof window === 'undefined') {
      return item.id || 'server-side';
    }
    
    // Use in-memory fallback if IndexedDB is not available
    if (!isIndexedDBAvailable()) {
      if (!item.id) {
        item.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      }
      memoryStorage[storeName] = memoryStorage[storeName] || {};
      memoryStorage[storeName][item.id] = item;
      return item.id;
    }
    
    // Return the item ID (real implementation would actually store it)
    return item.id || 'fallback-id';
  } catch (error) {
    console.error(`Error storing ${storeName} item:`, error);
    return 'error-id';
  }
}

// Process sync queue (placeholder implementation)
async function processSyncQueue(): Promise<void> {
  try {
    console.log('Processing sync queue (simplified implementation)');
    return Promise.resolve();
  } catch (error) {
    console.error('Error processing sync queue:', error);
    return Promise.resolve();
  }
}

// Export functions for use in the app
export default {
  // Generic functions
  getItem,
  addItem,
  updateItem: async <T>(storeName: string, id: string, item: Partial<T>): Promise<void> => {
    console.log(`Simulated update for ${storeName}:${id}`);
    return Promise.resolve();
  },
  deleteItem: async (storeName: string, id: string): Promise<void> => {
    console.log(`Simulated delete for ${storeName}:${id}`);
    return Promise.resolve();
  },
  getAllItems: async <T>(storeName: string): Promise<T[]> => {
    console.log(`Simulated getAllItems for ${storeName}`);
    return Promise.resolve([]);
  },
  queryByIndex: async <T>(storeName: string, indexName: string, indexValue: any): Promise<T[]> => {
    console.log(`Simulated queryByIndex for ${storeName}:${indexName}:${indexValue}`);
    return Promise.resolve([]);
  },
  
  // Sync queue functions
  addToSyncQueue: async (collection: string, action: string, data: any): Promise<string> => {
    console.log(`Simulated addToSyncQueue for ${collection}:${action}`);
    return Promise.resolve('sync-id');
  },
  getPendingSyncItems: async () => Promise.resolve([]),
  markAsSynced: async (id: string) => Promise.resolve(),
  processSyncQueue,
  
  // Activity functions
  saveActivityOffline: async (activity: any) => activity.id || 'activity-id',
  getChildActivitiesOffline: async () => [],
  
  // Observation functions
  saveObservationOffline: async (observation: any) => observation.id || 'observation-id',
  getChildObservationsOffline: async () => [],
  getActivityObservationsOffline: async () => [],
  
  // Weekly plan functions
  saveWeeklyPlanOffline: async (plan: any) => plan.id || 'plan-id',
  getChildWeeklyPlansOffline: async () => [],
  
  // Child functions
  saveChildOffline: async (child: any) => child.id || 'child-id',
  getUserChildrenOffline: async () => [],
  
  // Utility functions
  clearAllData: async () => {
    console.log('Simulated clearAllData');
    Object.keys(memoryStorage).forEach(key => { memoryStorage[key] = {}; });
    return Promise.resolve();
  },
  
  // Constants
  STORES
};