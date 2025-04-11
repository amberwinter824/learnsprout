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

async function cleanupMaterialDescriptions() {
  try {
    console.log('Starting material description cleanup...');
    
    // Get all materials with the generic description
    const materialsSnapshot = await adminDb.collection('materials')
      .where('description', '==', 'Used in various Montessori activities')
      .get();
    
    if (materialsSnapshot.empty) {
      console.log('No materials need description cleanup.');
      process.exit(0);
      return;
    }
    
    console.log(`Found ${materialsSnapshot.size} materials to clean up.`);
    
    // Create a batch for updates
    const batch = adminDb.batch();
    let updateCount = 0;
    
    materialsSnapshot.forEach(doc => {
      const material = doc.data();
      const materialRef = doc.ref;
      
      // Update the document with an empty description
      batch.update(materialRef, {
        description: '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Cleaning up description for "${material.name}"`);
      updateCount++;
    });
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully cleaned up ${updateCount} material descriptions!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up material descriptions:', error);
    process.exit(1);
  }
}

// Run the script
cleanupMaterialDescriptions(); 