// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxEjieQBNxZugmCs1t-TC5R3wvKAgkDdA",
  authDomain: "learn-sprout.firebaseapp.com",
  projectId: "learn-sprout",
  storageBucket: "learn-sprout.appspot.com",
  messagingSenderId: "453725467626",
  appId: "1:453725467626:web:353a01c707d19422857893"
};

// Initialize Firebase - simplify to avoid potential issues
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = null; // We'll add this back later if needed

console.log("Firebase initialized:", !!app);
console.log("Auth initialized:", !!auth);
console.log("DB initialized:", !!db);

export { auth, db, storage };