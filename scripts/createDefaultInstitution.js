// scripts/createDefaultInstitution.js
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

async function createDefaultEntities() {
  console.log('Starting creation of default institution and classroom...');

  // Check if we need to create an admin user
  let adminUserId = process.env.ADMIN_USER_ID;
  
  if (!adminUserId) {
    // Find a user to make admin, or create one
    const usersSnapshot = await db.collection('users').limit(1).get();
    
    if (!usersSnapshot.empty) {
      adminUserId = usersSnapshot.docs[0].id;
      
      // Update user to admin role
      await db.collection('users').doc(adminUserId).update({
        role: 'admin',
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Update custom claims
      await auth.setCustomUserClaims(adminUserId, { role: 'admin' });
      console.log(`Made user ${adminUserId} an admin`);
    } else {
      console.error('No users found to make admin');
      return;
    }
  }

  // Create a default institution if it doesn't exist
  const institutionsSnapshot = await db.collection('institutions').where('name', '==', 'Learn Sprout Academy').limit(1).get();
  
  let institutionId;
  
  if (institutionsSnapshot.empty) {
    // Create new institution
    const institutionRef = await db.collection('institutions').add({
      name: 'Learn Sprout Academy',
      type: 'montessori',
      administratorIds: [adminUserId],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    institutionId = institutionRef.id;
    console.log(`Created institution with ID: ${institutionId}`);
  } else {
    institutionId = institutionsSnapshot.docs[0].id;
    console.log(`Institution already exists with ID: ${institutionId}`);
  }

  // Create a default classroom if it doesn't exist
  const classroomsSnapshot = await db.collection('classrooms')
    .where('institutionId', '==', institutionId)
    .where('name', '==', 'Primary Classroom')
    .limit(1)
    .get();
  
  if (classroomsSnapshot.empty) {
    // Create new classroom
    const classroomRef = await db.collection('classrooms').add({
      name: 'Primary Classroom',
      institutionId,
      educatorIds: [adminUserId],
      ageGroups: ['3-4', '4-5', '5-6'],
      currentThemes: ['Practical Life', 'Sensorial', 'Language'],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    console.log(`Created classroom with ID: ${classroomRef.id}`);
  } else {
    console.log(`Classroom already exists with ID: ${classroomsSnapshot.docs[0].id}`);
  }

  console.log('Default entities creation complete!');
}

// Run the function
createDefaultEntities()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });