const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin
try {
  // Path to your service account JSON file
  const serviceAccountPath = path.join(__dirname, '../config/service-account.json');
  
  // Read and parse the service account file
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf8')
  );

  // Initialize the app with the service account
  initializeApp({
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
    
    initializeApp({
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

async function createAdminUser(email: string, password: string, displayName: string) {
  try {
    // Create the user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName
    });

    // Create the user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role: 'admin',
      createdAt: new Date(),
      lastLogin: new Date(),
      preferences: {
        emailNotifications: true,
        weeklyDigest: true,
        theme: 'light'
      }
    });

    // Set custom claims for admin role
    await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });

    console.log('Successfully created admin user:', {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];
const displayName = process.argv[4];

if (!email || !password || !displayName) {
  console.error('Usage: ts-node createAdminUser.ts <email> <password> <displayName>');
  process.exit(1);
}

createAdminUser(email, password, displayName)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 