// scripts/adminSchemaInit.js
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
 * Initialize or update the Firebase database schema
 * Adds new fields to existing collections and creates new collections
 * when necessary, while maintaining backward compatibility.
 */
async function initializeSchema() {
  console.log("Starting database schema initialization...");
  try {
    // Step 1: Update existing collections with new fields
    await updateExistingCollections();
    
    // Step 2: Create new collections if they don't exist
    await createNewCollections();
    
    console.log("Database schema initialization complete!");
    return true;
  } catch (error) {
    console.error("Error initializing database schema:", error);
    return false;
  }
}

/**
 * Update existing collections with new fields
 */
async function updateExistingCollections() {
  console.log("Updating existing collections...");
  
  // 1. Update Activities collection with new fields
  await updateActivitiesCollection();
  
  // 2. Update Users collection with role field
  await updateUsersCollection();
  
  // 3. Update Progress Records collection with environment context
  await updateProgressRecordsCollection();
}

/**
 * Update activities collection with new fields for environment context
 */
async function updateActivitiesCollection() {
  console.log("Updating activities collection...");
  
  try {
    const activitiesSnapshot = await db.collection('activities').get();
    
    if (activitiesSnapshot.empty) {
      console.log("No activities found to update");
      return;
    }
    
    console.log(`Found ${activitiesSnapshot.size} activities to process`);
    
    // Process each activity document
    let updatedCount = 0;
    for (const activityDoc of activitiesSnapshot.docs) {
      const activityData = activityDoc.data();
      const updates = {};
      let needsUpdate = false;
      
      // Add environmentType field if it doesn't exist
      if (!activityData.environmentType) {
        updates.environmentType = activityData.area?.includes('practical_life') ? 'home' : 'classroom';
        needsUpdate = true;
      }
      
      // Add classroomExtension field if it doesn't exist
      if (activityData.classroomExtension === undefined) {
        updates.classroomExtension = false;
        needsUpdate = true;
      }
      
      // Add homeReinforcement field if it doesn't exist
      if (activityData.homeReinforcement === undefined) {
        updates.homeReinforcement = true;
        needsUpdate = true;
      }
      
      // Update the activity if needed
      if (needsUpdate) {
        await activityDoc.ref.update({
          ...updates,
          updatedAt: FieldValue.serverTimestamp()
        });
        updatedCount++;
      }
    }
    
    console.log(`Activities collection update complete - updated ${updatedCount} activities`);
  } catch (error) {
    console.error("Error updating activities collection:", error);
    throw error;
  }
}

/**
 * Update users collection with role and institution fields
 */
async function updateUsersCollection() {
  console.log("Updating users collection...");
  
  try {
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log("No users found to update");
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} users to process`);
    
    // Process each user document
    let updatedCount = 0;
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const updates = {};
      let needsUpdate = false;
      
      // Add associatedInstitutions field if it doesn't exist
      if (!userData.associatedInstitutions) {
        updates.associatedInstitutions = [];
        needsUpdate = true;
      }
      
      // Update the user if needed
      if (needsUpdate) {
        await userDoc.ref.update({
          ...updates,
          updatedAt: FieldValue.serverTimestamp()
        });
        updatedCount++;
      }
    }
    
    console.log(`Users collection update complete - updated ${updatedCount} users`);
  } catch (error) {
    console.error("Error updating users collection:", error);
    throw error;
  }
}

/**
 * Update progressRecords collection with environment context fields
 */
async function updateProgressRecordsCollection() {
  console.log("Updating progressRecords collection...");
  
  try {
    const recordsSnapshot = await db.collection('progressRecords').get();
    
    if (recordsSnapshot.empty) {
      console.log("No progress records found to update");
      return;
    }
    
    console.log(`Found ${recordsSnapshot.size} progress records to process`);
    
    // Process each progress record
    let updatedCount = 0;
    for (const recordDoc of recordsSnapshot.docs) {
      const recordData = recordDoc.data();
      const updates = {};
      let needsUpdate = false;
      
      // Add environmentContext field if it doesn't exist
      if (!recordData.environmentContext) {
        updates.environmentContext = 'home'; // Default to home
        needsUpdate = true;
      }
      
      // Add observationType field if it doesn't exist
      if (!recordData.observationType) {
        updates.observationType = 'general'; // Default to general
        needsUpdate = true;
      }
      
      // Add visibility field if it doesn't exist
      if (!recordData.visibility) {
        updates.visibility = ['all']; // Default to visible to all
        needsUpdate = true;
      }
      
      // Update the record if needed
      if (needsUpdate) {
        await recordDoc.ref.update({
          ...updates,
          updatedAt: FieldValue.serverTimestamp()
        });
        updatedCount++;
      }
    }
    
    console.log(`Progress records collection update complete - updated ${updatedCount} records`);
  } catch (error) {
    console.error("Error updating progress records collection:", error);
    throw error;
  }
}

/**
 * Create new collections required for the enhanced platform
 */
async function createNewCollections() {
  console.log("Creating new collections if needed...");
  
  // Creating classroomChildren collection
  await createClassroomChildrenCollection();
  
  // Creating messages collection
  await createMessagesCollection();
}

/**
 * Create classroomChildren collection structure
 */
async function createClassroomChildrenCollection() {
  console.log("Setting up classroomChildren collection structure...");
  
  try {
    // Check if the collection already has documents
    const classroomChildrenSnapshot = await db.collection('classroomChildren')
      .where('__placeholder__', '==', true)
      .limit(1)
      .get();
    
    // Create a placeholder if the collection is empty
    if (classroomChildrenSnapshot.empty) {
      await db.collection('classroomChildren').doc('placeholder').set({
        __placeholder__: true,
        __info__: "This is a placeholder document to initialize the collection structure",
        createdAt: FieldValue.serverTimestamp()
      });
      
      console.log("Created classroomChildren collection with placeholder document");
    } else {
      console.log("ClassroomChildren collection already exists");
    }
  } catch (error) {
    console.error("Error setting up classroomChildren collection:", error);
    throw error;
  }
}

/**
 * Create messages collection structure
 */
async function createMessagesCollection() {
  console.log("Setting up messages collection structure...");
  
  try {
    // Check if the collection already has documents
    const messagesSnapshot = await db.collection('messages')
      .where('__placeholder__', '==', true)
      .limit(1)
      .get();
    
    // Create a placeholder if the collection is empty
    if (messagesSnapshot.empty) {
      await db.collection('messages').doc('placeholder').set({
        __placeholder__: true,
        __info__: "This is a placeholder document to initialize the collection structure",
        createdAt: FieldValue.serverTimestamp()
      });
      
      console.log("Created messages collection with placeholder document");
    } else {
      console.log("Messages collection already exists");
    }
  } catch (error) {
    console.error("Error setting up messages collection:", error);
    throw error;
  }
}

// Run the initialization
initializeSchema()
  .then(() => {
    console.log('Schema initialization completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Schema initialization failed:', error);
    process.exit(1);
  });