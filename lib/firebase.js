// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxEjieQBNxZugmCs1t-TC5R3wvKAgkDdA",
  authDomain: "learn-sprout.firebaseapp.com",
  projectId: "learn-sprout",
  storageBucket: "learn-sprout.appspot.com",
  messagingSenderId: "453725467626",
  appId: "1:453725467626:web:353a01c707d19422857893"
};

// Initialize Firebase only if it hasn't been initialized
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Log initialization
console.log("Firebase initialized:", !!app);
console.log("Auth initialized:", !!auth);
console.log("DB initialized:", !!db);

export { app, auth, db, storage };