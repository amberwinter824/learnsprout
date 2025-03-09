// utilities/firebaseSchemaInit.js
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/**
 * Initialize or update the Firebase database schema
 * Adds new fields to existing collections and creates new collections
 * when necessary, while maintaining backward compatibility.
 */
export async function initializeSchema() {
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
    const activitiesSnapshot = await getDocs(collection(db, 'activities'));
    
    if (activitiesSnapshot.empty) {
      console.log("No activities found to update");
      return;
    }
    
    console.log(`Found ${activitiesSnapshot.size} activities to process`);
    
    // Process each activity document
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
        await updateDoc(doc(db, 'activities', activityDoc.id), {
          ...updates,
          updatedAt: serverTimestamp()
        });
        console.log(`Updated activity ${activityDoc.id}`);
      }
    }
    
    console.log("Activities collection update complete");
  } catch (error) {
    console.error("Error updating activities collection:", error);
    throw error;
  }
}

/**
 * Update users collection with role field
 */
async function updateUsersCollection() {
  console.log("Updating users collection...");
  
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    if (usersSnapshot.empty) {
      console.log("No users found to update");
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} users to process`);
    
    // Process each user document
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const updates = {};
      let needsUpdate = false;
      
      // Add role field if it doesn't exist
      if (!userData.role) {
        updates.role = 'parent'; // Default role
        needsUpdate = true;
      }
      
      // Add associatedInstitutions field if it doesn't exist
      if (!userData.associatedInstitutions) {
        updates.associatedInstitutions = [];
        needsUpdate = true;
      }
      
      // Update the user if needed
      if (needsUpdate) {
        await updateDoc(doc(db, 'users', userDoc.id), {
          ...updates,
          updatedAt: serverTimestamp()
        });
        console.log(`Updated user ${userDoc.id} with role: ${updates.role || userData.role}`);
      }
    }
    
    console.log("Users collection update complete");
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
    const recordsSnapshot = await getDocs(collection(db, 'progressRecords'));
    
    if (recordsSnapshot.empty) {
      console.log("No progress records found to update");
      return;
    }
    
    console.log(`Found ${recordsSnapshot.size} progress records to process`);
    
    // Process each progress record
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
        await updateDoc(doc(db, 'progressRecords', recordDoc.id), {
          ...updates,
          updatedAt: serverTimestamp()
        });
        console.log(`Updated progress record ${recordDoc.id}`);
      }
    }
    
    console.log("Progress records collection update complete");
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
  
  // 1. Create institutions collection
  await createInstitutionsCollection();
  
  // 2. Create classrooms collection
  await createClassroomsCollection();
  
  // 3. Create classroomChildren collection
  await createClassroomChildrenCollection();
  
  // 4. Create messages collection
  await createMessagesCollection();
}

/**
 * Create institutions collection with sample data if not exists
 */
async function createInstitutionsCollection() {
  console.log("Setting up institutions collection...");
  
  try {
    // Check if collection already has data
    const institutionsSnapshot = await getDocs(collection(db, 'institutions'));
    
    if (!institutionsSnapshot.empty) {
      console.log(`Institutions collection already exists with ${institutionsSnapshot.size} documents`);
      return;
    }
    
    // Collection is empty, create sample institution
    // Note: This is just a sample; in production, the createDefaultInstitution.js script handles this
    const sampleInstitutionId = "sample-institution";
    await setDoc(doc(db, 'institutions', sampleInstitutionId), {
      name: "Learn Sprout Demo School",
      type: "montessori",
      administratorIds: [], // Will be populated by the admin script
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Created sample institution document with ID: ${sampleInstitutionId}`);
  } catch (error) {
    console.error("Error setting up institutions collection:", error);
    throw error;
  }
}

/**
 * Create classrooms collection with sample data if not exists
 */
async function createClassroomsCollection() {
  console.log("Setting up classrooms collection...");
  
  try {
    // Check if collection already has data
    const classroomsSnapshot = await getDocs(collection(db, 'classrooms'));
    
    if (!classroomsSnapshot.empty) {
      console.log(`Classrooms collection already exists with ${classroomsSnapshot.size} documents`);
      return;
    }
    
    // Collection is empty, check if we have a sample institution
    const institutionsSnapshot = await getDocs(collection(db, 'institutions'));
    
    if (institutionsSnapshot.empty) {
      console.log("No institutions found, skipping classroom creation");
      return;
    }
    
    // Use the first institution to create a sample classroom
    const institutionId = institutionsSnapshot.docs[0].id;
    
    // Create sample classroom
    const sampleClassroomId = "sample-classroom";
    await setDoc(doc(db, 'classrooms', sampleClassroomId), {
      name: "Primary Classroom",
      institutionId,
      educatorIds: [], // Will be populated by the admin script
      ageGroups: ["3-4", "4-5", "5-6"],
      currentThemes: ["Practical Life", "Sensorial", "Language"],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Created sample classroom document with ID: ${sampleClassroomId}`);
  } catch (error) {
    console.error("Error setting up classrooms collection:", error);
    throw error;
  }
}

/**
 * Create classroomChildren collection structure
 */
async function createClassroomChildrenCollection() {
  console.log("Setting up classroomChildren collection structure...");
  
  try {
    // This collection will be populated when users associate children with classrooms
    // For now, we'll just verify the collection exists
    const classroomChildrenSnapshot = await getDocs(
      query(collection(db, 'classroomChildren'), where('__placeholder__', '==', true))
    );
    
    if (classroomChildrenSnapshot.empty) {
      // Create a placeholder document to ensure the collection exists
      // This document should be removed after real data is added
      await setDoc(doc(db, 'classroomChildren', 'placeholder'), {
        __placeholder__: true,
        __info__: "This is a placeholder document to initialize the collection structure",
        createdAt: serverTimestamp()
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
    // This collection will be populated when users send messages
    // For now, we'll just verify the collection exists
    const messagesSnapshot = await getDocs(
      query(collection(db, 'messages'), where('__placeholder__', '==', true))
    );
    
    if (messagesSnapshot.empty) {
      // Create a placeholder document to ensure the collection exists
      // This document should be removed after real data is added
      await setDoc(doc(db, 'messages', 'placeholder'), {
        __placeholder__: true,
        __info__: "This is a placeholder document to initialize the collection structure",
        createdAt: serverTimestamp()
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

/**
 * Utility function to run the schema initialization
 */
export async function runSchemaInitialization() {
  console.log("Starting schema initialization process...");
  const success = await initializeSchema();
  console.log(`Schema initialization ${success ? 'completed successfully' : 'failed'}`);
  return success;
}

// Export the run function as default for direct script execution
export default runSchemaInitialization;