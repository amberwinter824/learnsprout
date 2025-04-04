import { config } from 'dotenv';
import { adminDb } from '../lib/firebaseAdmin';
import { essentialStarterKit, getHouseholdAlternative, isCommonHouseholdItem } from '../lib/materialsData';
import { FieldValue } from 'firebase-admin/firestore';

// Load environment variables
config({ path: '.env.local' });

async function updateMaterialsClassification() {
  try {
    console.log('Starting materials classification update...');
    
    // Get all materials from Firestore
    const materialsSnapshot = await adminDb.collection('materials').get();
    
    // Create a batch for updates
    const batch = adminDb.batch();
    let updateCount = 0;
    
    materialsSnapshot.forEach(doc => {
      const material = doc.data();
      const materialRef = doc.ref;
      
      // Determine material type
      let materialType = 'basic'; // Default
      
      // If it's a household item
      if (isCommonHouseholdItem(material.name)) {
        materialType = 'household';
      } 
      // Check if it's an advanced material
      else if (['binomial cube', 'trinomial cube', 'geometric cabinet', 'golden bead', 'metal insets']
          .some(term => material.name.toLowerCase().includes(term.toLowerCase()))) {
        materialType = 'advanced';
      }
      
      // Determine if essential
      const isEssential = essentialStarterKit.some(item => 
        item.name.toLowerCase() === material.name.toLowerCase() ||
        material.name.toLowerCase().includes(item.name.toLowerCase())
      );
      
      // Get household alternative
      const householdAlternative = getHouseholdAlternative(material.name);
      
      // Update the document
      batch.update(materialRef, {
        materialType,
        isEssential,
        householdAlternative,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      updateCount++;
    });
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully updated ${updateCount} materials!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating materials classification:', error);
    process.exit(1);
  }
}

// Run the update
updateMaterialsClassification(); 