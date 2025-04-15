import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import activityGuidance from './activityGuidance.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

async function streamlineActivityData() {
  console.log('Starting to streamline activity data...');
  
  try {
    // Get all activities
    const activitiesRef = db.collection('activities');
    const snapshot = await activitiesRef.get();
    
    if (snapshot.empty) {
      console.log('No activities found in the database');
      return;
    }
    
    console.log(`Found ${snapshot.size} activities to process`);
    let updatedCount = 0;
    let skippedCount = 0;
    
    console.log('\nStarting updates:');
    console.log('----------------------------------------');
    
    for (const doc of snapshot.docs) {
      try {
        const activity = doc.data();
        const title = activity.title;
        
        // Fields to streamline
        const fieldsToLimit = ['successIndicators', 'commonChallenges'];
        let updateNeeded = false;
        const updates = {};
        
        // Check each field that needs to be limited
        fieldsToLimit.forEach(field => {
          if (activity[field] && Array.isArray(activity[field]) && activity[field].length > 3) {
            updates[field] = activity[field].slice(0, 3);
            updateNeeded = true;
          }
        });
        
        // Only update if we need to streamline data
        if (updateNeeded) {
          await doc.ref.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✓ Streamlined data for activity: ${title}`);
          console.log(`  - Reduced fields: ${Object.keys(updates).join(', ')}`);
          updatedCount++;
        } else {
          console.log(`⚠️ No streamlining needed for: ${title}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`✗ Failed to update activity ${doc.id}:`, error);
        skippedCount++;
      }
    }
    
    console.log('\nUpdate complete!');
    console.log(`Successfully streamlined: ${updatedCount} activities`);
    console.log(`Skipped: ${skippedCount} activities (no streamlining needed)`);
    
  } catch (error) {
    console.error('Update failed:', error);
    throw error;
  }
}

// Run the update if this script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  streamlineActivityData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { streamlineActivityData }; 