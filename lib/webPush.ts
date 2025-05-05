import { base64ToUint8Array } from '@/lib/utils';

// Your VAPID public key should be in the correct format
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const isDevelopment = process.env.NODE_ENV === 'development';

export function getVapidKey(): Uint8Array | null {
  if (!publicKey) {
    // Only show error in development mode to reduce console noise
    if (isDevelopment) {
      console.error('VAPID public key is not defined in environment variables');
    }
    return null;
  }
  
  try {
    return base64ToUint8Array(publicKey);
  } catch (error) {
    if (isDevelopment) {
      console.error('Invalid VAPID public key format:', error);
    }
    return null;
  }
} 