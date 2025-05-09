require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

// Mapping of old skill IDs to new skill IDs
const skillIdMapping = {
  'lan-communication': 'lan-vocabulary',
  'mat-patterns': 'mat-operations',
  'soc-interaction': 'soc-relationships',
  'sen-exploration': 'sen-sensory-awareness',
  'prl-independence': 'soc-independence',
  'soc-emotional': 'soc-emotion-reg',
  'mat-sorting': 'tod-sorting',
  'cul-awareness': 'cul-art',
  'cul-exploration': 'cul-botany',
  'sen-discrimination': 'sen-visual'
};

/**
 * Update skill IDs in the childSkills collection
 */
async function updateSkillIds() {
  console.log('Starting skill ID update...');
  
  try {
    // Get all child skills
    const skillsCollection = db.collection('childSkills');
    const skillsSnapshot = await skillsCollection.get();
    console.log(`Found ${skillsSnapshot.size} child skills to process`);
    
    // Process in batches
    const batchSize = 20;
    let batchCount = 0;
    let updateCount = 0;
    let batch = db.batch();
    
    for (const doc of skillsSnapshot.docs) {
      const data = doc.data();
      const oldSkillId = data.skillId;
      const newSkillId = skillIdMapping[oldSkillId];
      
      if (newSkillId) {
        // Update the skill ID
        batch.update(doc.ref, {
          skillId: newSkillId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
        
        // If reached batch size, commit and create new batch
        if (updateCount % batchSize === 0) {
          batchCount++;
          console.log(`Committing batch ${batchCount} (${updateCount} updates)...`);
          await batch.commit();
          batch = db.batch();
        }
      }
    }
    
    // Commit any remaining updates
    if (updateCount % batchSize !== 0) {
      batchCount++;
      console.log(`Committing final batch ${batchCount} (${updateCount % batchSize} updates)...`);
      await batch.commit();
    }
    
    console.log(`Successfully updated ${updateCount} skill IDs across ${batchCount} batches`);
    return true;
    
  } catch (error) {
    console.error('Error updating skill IDs:', error);
    return false;
  }
}

// Export for potential use in other scripts
module.exports = {
  updateSkillIds,
  skillIdMapping
};

// If running this script directly
if (require.main === module) {
  console.log("Service account check:");
  try {
    // Log basic information about the service account to confirm it's loaded
    console.log(`Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    console.log(`Client Email: ${process.env.FIREBASE_ADMIN_CLIENT_EMAIL}`);
    console.log(`Service account loaded successfully`);
    
    updateSkillIds().then(() => {
      console.log('Skill ID update process completed!');
      process.exit(0);
    }).catch(error => {
      console.error('Fatal error during update process:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Error accessing service account:", error);
    console.error("Make sure environment variables are set correctly");
    process.exit(1);
  }
} 