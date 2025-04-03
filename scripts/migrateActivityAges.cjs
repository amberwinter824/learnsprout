const { db } = require('@/lib/firebase');
const { collection, getDocs, updateDoc } = require('firebase/firestore');

const migrateActivityAges = async () => {
  console.log('Starting activity age migration...');
  
  try {
    // Get all activities
    const activitiesRef = collection(db, 'activities');
    const snapshot = await getDocs(activitiesRef);
    
    console.log(`Found ${snapshot.size} activities to migrate`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const minAge = data.minAge || 0;
        const maxAge = data.maxAge || 0;
        
        // Create array of all ages between min and max (inclusive)
        const ageRange = Array.from(
          { length: maxAge - minAge + 1 },
          (_, i) => minAge + i
        );
        
        // Update the document with the new ageRange field while preserving minAge/maxAge
        await updateDoc(doc.ref, { 
          ageRange,
          // Keep the original fields for reference
          minAge,
          maxAge,
          // Add metadata about the migration
          lastUpdated: new Date(),
          migrationVersion: 'v1-age-range'
        });
        
        console.log(`✓ Migrated activity ${doc.id}: ages ${minAge}-${maxAge} → [${ageRange.join(', ')}]`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to migrate activity ${doc.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\nMigration complete!');
    console.log(`Successfully migrated: ${successCount} activities`);
    console.log(`Failed to migrate: ${errorCount} activities`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Execute the migration
migrateActivityAges().then(() => {
  console.log('Migration script finished');
  process.exit(0);
}).catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
}); 