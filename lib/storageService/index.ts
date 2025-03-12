// Re-export functions from storageService.ts
import { 
  uploadPhotoToStorage,
  syncOfflinePhotos,
  getChildPhotos,
  deletePhoto
} from '../storageService';

export {
  uploadPhotoToStorage,
  syncOfflinePhotos,
  getChildPhotos,
  deletePhoto
};

export default {
  uploadPhotoToStorage,
  syncOfflinePhotos,
  getChildPhotos,
  deletePhoto
}; 