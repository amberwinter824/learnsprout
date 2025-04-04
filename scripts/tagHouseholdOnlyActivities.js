import { config } from 'dotenv';
import { adminDb } from '../lib/firebaseAdmin';
import { isCommonHouseholdItem } from '../lib/materialsData';
import { FieldValue } from 'firebase-admin/firestore';

// Load environment variables
config({ path: '.env.local' });

async function tagHouseholdOnlyActivities() {
  try {
    console.log('Starting household-only activities tagging...');
    
    // Get all activities from Firestore
    const activitiesSnapshot = await adminDb.collection('activities').get();
    
    // Create a batch for updates
    const batch = adminDb.batch();
    let householdOnlyCount = 0;
    let requiresMaterialsCount = 0;
    
    activitiesSnapshot.forEach(doc => {
      const activity = doc.data();
      const activityRef = doc.ref;
      
      // Check if all materials are household items or if no materials needed
      const materialsNeeded = activity.materialsNeeded || [];
      const isHouseholdOnly = materialsNeeded.length === 0 || 
        materialsNeeded.every(material => isCommonHouseholdItem(material));
      
      // Update the document
      batch.update(activityRef, {
        householdOnly: isHouseholdOnly,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      if (isHouseholdOnly) {
        householdOnlyCount++;
      } else {
        requiresMaterialsCount++;
      }
    });
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully tagged ${householdOnlyCount} household-only activities and ${requiresMaterialsCount} activities requiring Montessori materials!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error tagging household-only activities:', error);
    process.exit(1);
  }
}

// Run the update
tagHouseholdOnlyActivities(); 