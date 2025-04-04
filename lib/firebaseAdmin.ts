import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Check for required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Firebase Admin configuration
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n')
};

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(firebaseAdminConfig)
  });
}

// Export Firebase Admin services
export const adminAuth = getAuth();
export const adminDb = getFirestore(); 