import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

export async function GET(request: NextRequest) {
  // Check for Firebase Service Account
  const hasFBServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const fbKeyLength = hasFBServiceAccount ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY!.length : 0;
  
  // Check for Resend API key
  const hasResendKey = !!process.env.RESEND_API_KEY;
  const resendKeyLength = hasResendKey ? process.env.RESEND_API_KEY!.length : 0;
  
  // Check if Firebase is already initialized
  const isFirebaseInitialized = getApps().length > 0;
  
  // Get Node environment
  const nodeEnv = process.env.NODE_ENV || 'unknown';
  
  let fbKeyValidJSON = false;
  
  // Try to decode and parse the Firebase service account key
  if (hasFBServiceAccount) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '', 'base64').toString();
      try {
        const json = JSON.parse(decoded);
        fbKeyValidJSON = true;
      } catch (jsonError) {
        console.error('Firebase service account key is not valid JSON after decoding');
      }
    } catch (error) {
      console.error('Firebase service account key could not be decoded from base64');
    }
  }
  
  // Return the environment variable status
  return NextResponse.json({
    environment: nodeEnv,
    firebase: {
      serviceAccountPresent: hasFBServiceAccount,
      serviceAccountLength: fbKeyLength,
      serviceAccountValid: fbKeyValidJSON,
      alreadyInitialized: isFirebaseInitialized
    },
    resend: {
      apiKeyPresent: hasResendKey,
      apiKeyLength: resendKeyLength
    }
  });
} 