// scripts/createNewCollections.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

/**
 * Create new collections required for the enhanced platform
 */
async function createNewCollections() {
  console.log("Creating new collections...");
  
  // 1. Create classroomChildren collection
  await createClassroomChildrenCollection();
  
  // 2. Create messages collection
  await createMessagesCollection();
  
  console.log("Collections creation complete!");
  return true;
}

/**
 * Create the classroomChildren collection
 */
async function createClassroomChildrenCollection() {
  console.log("Creating classroomChildren collection...");
  
  try {
    // Check if collection already exists by checking if it's empty
    const existingDocs = await db.collection('classroomChildren').limit(1).get();
    
    if (!existingDocs.empty) {
      console.log("classroomChildren collection already has documents");
      return;
    }
    
    // Create a placeholder document without using reserved field names
    await db.collection('classroomChildren').doc('placeholder').set({
      isPlaceholder: true,
      info: "This is a placeholder document to initialize the collection structure",
      createdAt: FieldValue.serverTimestamp()
    });
    
    console.log("Created classroomChildren collection with placeholder document");
  } catch (error) {
    console.error("Error creating classroomChildren collection:", error);
    throw error;
  }
}

/**
 * Create the messages collection
 */
async function createMessagesCollection() {
  console.log("Creating messages collection...");
  
  try {
    // Check if collection already exists by checking if it's empty
    const existingDocs = await db.collection('messages').limit(1).get();
    
    if (!existingDocs.empty) {
      console.log("messages collection already has documents");
      return;
    }
    
    // Create a placeholder document without using reserved field names
    await db.collection('messages').doc('placeholder').set({
      isPlaceholder: true,
      info: "This is a placeholder document to initialize the collection structure",
      createdAt: FieldValue.serverTimestamp()
    });
    
    console.log("Created messages collection with placeholder document");
  } catch (error) {
    console.error("Error creating messages collection:", error);
    throw error;
  }
}

// Run the initialization
createNewCollections()
  .then(() => {
    console.log('New collections created successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Collection creation failed:', error);
    process.exit(1);
  });