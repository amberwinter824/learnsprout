// scripts/initFirebaseSchema.js
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// Using dynamic import to handle potential module resolution issues
let firebaseSchemaInit;
try {
  firebaseSchemaInit = await import('../utilities/firebaseSchemaInit.js');
} catch (err) {
  console.error("Failed to import from '../utilities/firebaseSchemaInit.js':", err);
  try {
    // Try alternative path
    firebaseSchemaInit = await import('./utilities/firebaseSchemaInit.js');
  } catch (err2) {
    console.error("Failed to import from './utilities/firebaseSchemaInit.js':", err2);
    console.error("Please check that the firebaseSchemaInit.js file exists in the utilities folder");
    process.exit(1);
  }
}

// Load environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase initialized for schema update");

// Run the initialization
try {
  // Get the run function from the imported module
  const runSchemaInitialization = firebaseSchemaInit.runSchemaInitialization || 
                                  firebaseSchemaInit.default;
  
  if (typeof runSchemaInitialization !== 'function') {
    console.error("Could not find runSchemaInitialization function in the imported module");
    process.exit(1);
  }
  
  // Run the schema initialization
  await runSchemaInitialization();
  
  console.log("Schema initialization completed.");
  
  // Exit successfully
  process.exit(0);
} catch (error) {
  console.error("Schema initialization failed:", error);
  
  // Exit with error code
  process.exit(1);
}