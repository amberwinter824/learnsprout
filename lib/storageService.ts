import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  addDoc, 
  collection, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { storage } from './firebase';
import { db } from './firebase';
import offlineStorage from './offlineStorage';
  
  interface UploadOptions {
    file: File;
    folder: string;
    childId: string;
    onProgress?: (progress: number) => void;
    metadata?: Record<string, string>;
  }
  
  /**
   * Uploads a photo to Firebase Storage
   * @param options Upload options
   * @returns Promise with the download URL
   */
  export const uploadPhotoToStorage = async (options: UploadOptions): Promise<string> => {
    const { file, folder, childId, onProgress, metadata = {} } = options;
    
    // Check if we're online
    if (!navigator.onLine) {
      // If offline, store the file in IndexedDB
      return savePhotoForLaterUpload(options);
    }
    
    // Add the rest of the implementation here
    // This is just a placeholder to ensure the function returns a string
    try {
      // Create a storage reference
      const storageRef = ref(storage, `${folder}/${childId}/${Date.now()}_${file.name}`);
      
      // Upload the file
      const uploadTask = uploadBytesResumable(storageRef, file, {
        customMetadata: metadata
      });
      
      // Return a promise that resolves with the download URL
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress handling
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
          },
          (error) => {
            // Error handling
            reject(error);
          },
          async () => {
            // Upload completed successfully
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Store reference in Firestore
              await storePhotoReference({
                url: downloadURL,
                path: storageRef.fullPath,
                childId,
                contentType: file.type,
                fileName: file.name,
                size: file.size,
                metadata
              });
              
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };
  
  /**
   * Stores a reference to an uploaded photo in Firestore
   */
  const storePhotoReference = async (photoData: {
    url: string;
    path: string;
    childId: string;
    contentType: string;
    fileName: string;
    size: number;
    metadata?: Record<string, string>;
  }): Promise<string> => {
    try {
      // Create the photo document in Firestore
      const photoRef = await addDoc(collection(db, 'photos'), {
        url: photoData.url,
        path: photoData.path,
        childId: photoData.childId,
        contentType: photoData.contentType,
        fileName: photoData.fileName,
        size: photoData.size,
        metadata: photoData.metadata || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return photoRef.id;
    } catch (error) {
      console.error('Error storing photo reference:', error);
      throw error;
    }
  };
  
  /**
   * Saves a photo for later upload when online
   */
  const savePhotoForLaterUpload = async (options: UploadOptions): Promise<string> => {
    const { file, childId, metadata = {} } = options;
    
    try {
      // Generate a unique ID for the offline photo
      const timestamp = Date.now();
      const uniqueId = `offline_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a data URL from the file for offline preview
      const dataUrl = await readFileAsDataURL(file);
      
      // Store the file in IndexedDB
      const photoData = {
        id: uniqueId,
        file: dataUrl,
        childId,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        metadata,
        createdAt: timestamp,
        synced: false
      };
      
      // Save to offline storage
      await offlineStorage.addItem('offlinePhotos', photoData);
      
      // Add to sync queue for later upload
      await offlineStorage.addToSyncQueue('photos', 'create', photoData);
      
      // Return a temporary URL for the photo
      return dataUrl;
    } catch (error) {
      console.error('Error saving photo for later upload:', error);
      throw error;
    }
  };
  
  /**
   * Helper function to read a file as a data URL
   */
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsDataURL(file);
    });
  };
  
  /**
   * Upload offline photos when back online
   */
  export const syncOfflinePhotos = async (): Promise<void> => {
    try {
      // Get all offline photos
      const offlinePhotos = await offlineStorage.queryByIndex('offlinePhotos', 'synced', false);
      
      if (offlinePhotos.length === 0) {
        return;
      }
      
      console.log(`Found ${offlinePhotos.length} offline photos to sync`);
      
      // Upload each photo
      for (const photoData of offlinePhotos) {
        try {
          // Type check and cast photoData
          if (typeof photoData === 'object' && photoData !== null && 
              'file' in photoData && 'fileName' in photoData && 'childId' in photoData && 'id' in photoData) {
            // Convert data URL back to file
            const file = dataURLtoFile(
              photoData.file as string,
              (photoData.fileName as string) || `offline_${Date.now()}.jpg`
            );
            
            // Upload to Firebase Storage
            const downloadURL = await uploadPhotoToStorage({
              file,
              folder: 'observations',
              childId: photoData.childId as string,
            });
            
            // Mark as synced
            await offlineStorage.updateItem('offlinePhotos', photoData.id as string, { synced: true, url: downloadURL });
            
            console.log(`Synced offline photo: ${photoData.id}`);
          }
        } catch (error) {
          if (photoData && typeof photoData === 'object' && 'id' in photoData) {
            console.error(`Failed to sync offline photo ${photoData.id}:`, error);
          } else {
            console.error(`Failed to sync offline photo:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing offline photos:', error);
      throw error;
    }
  };
  
  /**
   * Helper function to convert a data URL to a File
   */
  const dataURLtoFile = (dataURL: string, filename: string): File => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  };
  
  /**
   * Get photos for a child
   */
  export const getChildPhotos = async (childId: string): Promise<any[]> => {
    try {
      // Get photos from Firestore
      const photosRef = collection(db, 'photos');
      const q = query(
        photosRef,
        where('childId', '==', childId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      // Convert to array of photo data
      const photos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get offline photos
      const offlinePhotos = await offlineStorage.queryByIndex('offlinePhotos', 'childId', childId);
      
      // Combine and sort by createdAt
      return [...photos, ...offlinePhotos].sort((a, b) => {
        // Type guard for 'a' and 'b'
        const timeA = typeof a === 'object' && a !== null && 'createdAt' in a 
          ? (typeof a.createdAt === 'object' && a.createdAt !== null && 'toMillis' in a.createdAt 
              ? a.createdAt.toMillis() 
              : a.createdAt) 
          : 0;
        
        const timeB = typeof b === 'object' && b !== null && 'createdAt' in b
          ? (typeof b.createdAt === 'object' && b.createdAt !== null && 'toMillis' in b.createdAt 
              ? b.createdAt.toMillis() 
              : b.createdAt)
          : 0;
        
        return timeB - timeA;
      });
    } catch (error) {
      console.error('Error getting child photos:', error);
      
      // If offline or error, try to get from offline storage
      try {
        return await offlineStorage.queryByIndex('offlinePhotos', 'childId', childId);
      } catch (offlineError) {
        console.error('Error getting offline photos:', offlineError);
        return [];
      }
    }
  };
  
  /**
   * Delete a photo
   */
  export const deletePhoto = async (photoId: string, storagePath?: string): Promise<void> => {
    try {
      // Delete from Firestore
      const photoDocRef = doc(db, 'photos', photoId);
      await deleteDoc(photoDocRef);
      
      // Delete from Storage if path is provided
      if (storagePath) {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  };
  
  export default {
    uploadPhotoToStorage,
    syncOfflinePhotos,
    getChildPhotos,
    deletePhoto
  };// lib/storageService.ts