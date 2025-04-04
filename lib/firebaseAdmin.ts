import admin from 'firebase-admin';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin with environment variables
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
};

// Initialize Firebase Admin if it hasn't been initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth(); 