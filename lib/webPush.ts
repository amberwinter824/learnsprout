import { base64ToUint8Array } from '@/lib/utils';

// Your VAPID public key should be in the correct format
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function getVapidKey(): Uint8Array | null {
  if (!publicKey) {
    console.error('VAPID public key is not defined in environment variables');
    return null;
  }
  
  try {
    return base64ToUint8Array(publicKey);
  } catch (error) {
    console.error('Invalid VAPID public key format:', error);
    return null;
  }
} 