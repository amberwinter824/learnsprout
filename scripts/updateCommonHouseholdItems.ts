import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const COMMON_HOUSEHOLD_ITEMS = [
  'water',
  'sponge',
  'paper',
  'colored pencils',
  'dry beans',
  'fresh flowers',
  'bread or crackers',
  'soap',
  'towel',
  'dried beans or rice',
  'small cup',
  'small basin',
  'mild soap',
  'drying cloth',
  'apron',
  'small table or tray',
  'small amount of water',
  'small towel',
  'large paper',
  'art smock or old shirt',
  'cleaning materials'
];

async function updateCommonHouseholdItems() {
  try {
    console.log('Starting update of common household items...');
    
    // Get all materials
    const materialsRef = collection(db, 'materials');
    const snapshot = await getDocs(materialsRef);
    
    let updatedCount = 0;
    
    // Process each material
    for (const doc of snapshot.docs) {
      const material = doc.data();
      const normalizedName = material.name.toLowerCase().trim();
      
      // Check if this material is in our common household items list
      if (COMMON_HOUSEHOLD_ITEMS.some(item => normalizedName.includes(item))) {
        // Update the material to mark it as a common household item
        await updateDoc(doc.ref, {
          isCommonHouseholdItem: true
        });
        console.log(`Updated ${material.name} as common household item`);
        updatedCount++;
      }
    }
    
    console.log(`Completed! Updated ${updatedCount} materials as common household items`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating materials:', error);
    process.exit(1);
  }
}

updateCommonHouseholdItems(); 