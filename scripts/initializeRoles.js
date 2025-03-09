// scripts/initializeRoles.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
let app;
try {
  // Path to your service account JSON file
  const serviceAccountPath = join(__dirname, '../config/service-account.json');
  
  // Read and parse the service account file
  const serviceAccount = JSON.parse(
    readFileSync(serviceAccountPath, 'utf8')
  );

  // Initialize the app with the service account
  app = initializeApp({
    credential: cert(serviceAccount)
  });
  console.log("Initialized Firebase Admin with service account file");
} catch (error) {
  console.error('Error initializing Firebase Admin with file:', error);
  
  // Fallback to environment variables
  try {
    if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      console.error('Missing environment variables for Firebase Admin');
      process.exit(1);
    }
    
    app = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
    console.log("Initialized Firebase Admin with environment variables");
  } catch (envError) {
    console.error('Error initializing Firebase Admin with environment variables:', envError);
    process.exit(1);
  }
}

const db = getFirestore();
const auth = getAuth();

async function initializeRoles() {
  console.log('Starting role initialization...');

  // Get all users from Firestore
  const usersSnapshot = await db.collection('users').get();
  
  if (usersSnapshot.empty) {
    console.log('No users found in database');
    return;
  }

  console.log(`Found ${usersSnapshot.size} users`);
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    try {
      // Get the user from Auth
      const userRecord = await auth.getUser(userId);
      
      // Check if user already has a role in Firestore
      if (!userData.role) {
        // Set default role to 'parent'
        await userDoc.ref.update({
          role: 'parent',
          updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`Set default role 'parent' for user ${userId} in Firestore`);
      }
      
      // Check if user already has custom claims
      const customClaims = userRecord.customClaims || {};
      
      if (!customClaims.role) {
        // Use the role from Firestore, or default to 'parent'
        const role = userData.role || 'parent';
        
        // Set custom claims in Firebase Auth
        await auth.setCustomUserClaims(userId, { 
          ...customClaims, 
          role 
        });
        console.log(`Set custom claim role '${role}' for user ${userId} in Auth`);
      }
    } catch (error) {
      console.error(`Error processing user ${userId}:`, error);
    }
  }

  console.log('Role initialization complete!');
}

// Run the initialization
initializeRoles()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });