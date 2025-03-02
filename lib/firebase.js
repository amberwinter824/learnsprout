// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxEjieQBNxZugmCs1t-TC5R3wvKAgkDdA",
  authDomain: "learn-sprout.firebaseapp.com",
  projectId: "learn-sprout",
  storageBucket: "learn-sprout.appspot.com",
  messagingSenderId: "453725467626",
  appId: "1:453725467626:web:353a01c707d19422857893"
};

// Initialize Firebase 
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Log initialization
console.log("Firebase initialized:", !!app);
console.log("Auth initialized:", !!auth);
console.log("DB initialized:", !!db);

export { app, auth, db, storage };