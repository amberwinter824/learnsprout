require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with environment variables
console.log('Initializing Firebase Admin...');
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  process.exit(1);
}

const db = admin.firestore();

/**
 * Update Firestore with enhanced skills data while maintaining backward compatibility
 */
async function updateFirestoreSkills() {
  try {
    // Read enhanced JSON data
    const jsonPath = path.resolve(__dirname, '../enhanced_developmental_skills.json');
    console.log(`Reading enhanced skills from ${jsonPath}...`);
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }
    
    const enhancedSkills = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Read ${enhancedSkills.length} enhanced skills.`);
    
    // Get current skills from Firestore to check differences
    const skillsRef = db.collection('developmentalSkills');
    const snapshot = await skillsRef.get();
    console.log(`Found ${snapshot.size} existing skills in Firestore.`);
    
    // Process updates in batches for better performance
    const batchSize = 20;
    let batchCount = 0;
    let updateCount = 0;
    let batch = db.batch();
    
    // Fixed approach: Process skills in a simple for loop instead of map
    // This ensures proper batch handling
    for (let i = 0; i < enhancedSkills.length; i++) {
      const enhancedSkill = enhancedSkills[i];
      
      // Get document reference
      const skillRef = skillsRef.doc(enhancedSkill.skillId);
      
      // Get existing skill data if it exists
      const skillDoc = snapshot.docs.find(doc => doc.id === enhancedSkill.skillId);
      
      if (!skillDoc) {
        console.log(`Warning: Skill ${enhancedSkill.skillId} not found in Firestore.`);
        continue; // Skip to the next skill
      }
      
      const existingData = skillDoc.data();
      
      // Create update data object
      const updateData = {
        // Maintain backward compatibility with original fields
        // Only update if existing value is undefined or not set
        name: existingData.name || enhancedSkill.skillName,
        description: existingData.description || enhancedSkill.description,
        area: existingData.area || enhancedSkill.area,
        
        // Keep existing ageRanges (for backward compatibility) and add the new format
        // This ensures existing filters and UI continue to work
        ageRanges: existingData.ageRanges || [], // Keep as is for compatibility
        
        // Add new fields
        asqDomain: enhancedSkill.asqDomain,
        ageRangesMonths: enhancedSkill.ageRanges, // New field with month-based ranges
        indicators: enhancedSkill.indicators,
        observationPrompts: enhancedSkill.observationPrompts,
        developmentalImportance: enhancedSkill.developmentalImportance,
        
        // Add metadata
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        enhancedWithASQ: true
      };
      
      // Add to batch
      batch.update(skillRef, updateData);
      updateCount++;
      
      // If reached batch size or final item, commit and create new batch
      if (updateCount % batchSize === 0 || i === enhancedSkills.length - 1) {
        batchCount++;
        console.log(`Committing batch ${batchCount} (${updateCount % batchSize || batchSize} updates)...`);
        await batch.commit();
        
        // Only create a new batch if there are more items to process
        if (i < enhancedSkills.length - 1) {
          batch = db.batch();
        }
      }
    }
    
    console.log(`Successfully updated ${updateCount} skills in Firestore across ${batchCount} batches.`);
    return true;
  } catch (error) {
    console.error('Error updating Firestore skills:', error);
    return false;
  }
}

// Run the update script
updateFirestoreSkills()
  .then(result => {
    if (result) {
      console.log('Firestore update completed successfully');
      process.exit(0);
    } else {
      console.error('Firestore update failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 