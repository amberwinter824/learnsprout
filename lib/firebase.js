// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCxEjieQBNxZugmCs1t-TC5R3wvKAgkDdA",
  authDomain: "learn-sprout.firebaseapp.com",
  projectId: "learn-sprout",
  storageBucket: "learn-sprout.appspot.com",
  messagingSenderId: "453725467626",
  appId: "1:453725467626:web:353a01c707d19422857893",
};

// Initialize Firebase if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };