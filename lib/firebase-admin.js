// lib/firebase-admin.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin with environment variables
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    // The private key needs special handling as environment variables can mess up the formatting
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
};

// Only initialize the app if it hasn't been initialized
const apps = getApps();
const adminApp = apps.length === 0 ? initializeApp(firebaseAdminConfig) : apps[0];

// Get admin services
const adminDb = getFirestore();
const adminAuth = getAuth();

export { adminApp, adminDb, adminAuth };