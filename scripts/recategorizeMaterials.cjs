require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
let app;
try {
  app = admin.app();
} catch (error) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const adminDb = admin.firestore();

// Helper function to determine material type
function determineMaterialType(material) {
  const lowerName = material.name.toLowerCase();
  
  // First check if it's a household item based on common items
  if (isCommonHouseholdItem(lowerName)) {
    return 'household';
  }
  
  // Check if it's an advanced material based on specific keywords
  if (lowerName.includes('binomial') || 
      lowerName.includes('trinomial') || 
      lowerName.includes('geometric cabinet') || 
      lowerName.includes('golden bead') || 
      lowerName.includes('metal inset') ||
      lowerName.includes('grammar') ||
      lowerName.includes('decimal') ||
      material.category === 'Advanced Mathematics' ||
      material.category === 'Advanced Language') {
    return 'advanced';
  }
  
  // Default to basic for everything else
  // This is safe because household items are already filtered out
  return 'basic';
}

// Helper function to check if something is a common household item
function isCommonHouseholdItem(name) {
  const commonItems = [
    'water', 'spoon', 'fork', 'knife', 'plate', 'bowl', 'cup', 'mug', 'napkin',
    'towel', 'soap', 'sponge', 'container', 'basket', 'tray', 'measuring',
    'paper', 'pencil', 'pen', 'marker', 'crayon', 'scissors', 'glue', 'tape',
    'box', 'bag', 'bottle', 'jar', 'lid', 'cloth', 'fabric', 'tissue',
    'cotton', 'brush', 'broom', 'dustpan', 'mop', 'rag',
    'sand', 'dirt', 'soil', 'rock', 'stone', 'leaf', 'stick', 'shell',
    'rice', 'bean', 'pasta', 'cereal', 'flour', 'salt', 'sugar', 'spice',
    'bucket', 'spray', 'hammer', 'screwdriver', 'pliers', 'tongs',
    'book', 'card', 'puzzle', 'block', 'bead', 'button', 'coin', 'key',
    'lock', 'magnet', 'mirror', 'ball', 'rope', 'string'
  ];
  
  return commonItems.some(item => name.includes(item));
}

async function recategorizeMaterials() {
  try {
    console.log('Starting materials recategorization...');
    
    // Get all materials that are either uncategorized or marked as 'other'
    const materialsSnapshot = await adminDb.collection('materials')
      .where('materialType', 'in', ['other', null, ''])
      .get();
    
    if (materialsSnapshot.empty) {
      console.log('No materials need recategorization.');
      process.exit(0);
      return;
    }
    
    console.log(`Found ${materialsSnapshot.size} materials to recategorize.`);
    
    // Create a batch for updates
    const batch = adminDb.batch();
    let updateCount = 0;
    
    materialsSnapshot.forEach(doc => {
      const material = doc.data();
      const materialRef = doc.ref;
      
      // Determine the correct material type
      const newType = determineMaterialType(material);
      
      // Update the document
      batch.update(materialRef, {
        materialType: newType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Recategorizing "${material.name}" from "${material.materialType || 'uncategorized'}" to "${newType}"`);
      updateCount++;
    });
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully recategorized ${updateCount} materials!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error recategorizing materials:', error);
    process.exit(1);
  }
}

// Run the script
recategorizeMaterials(); 