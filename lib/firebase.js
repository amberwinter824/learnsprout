// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.firebase_api_key || "AIzaSyCxEjieQBNxZugmCs1t-TC5R3wvKAgkDdA",
  authDomain: process.env.firebase_auth_domain || "learn-sprout.firebaseapp.com",
  projectId: process.env.firebase_project_id || "learn-sprout",
  storageBucket: process.env.firebase_storage_bucket || "learn-sprout.appspot.com",
  messagingSenderId: process.env.firebase_messaging_sender_id || "453725467626",
  appId: process.env.firebase_app_id || "1:453725467626:web:353a01c707d19422857893",
};

// Initialize Firebase if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };