// scripts/importMaterialLinks.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin if not already initialized
let app;
try {
  app = admin.app();
} catch (error) {
  // Use environment variables for Firebase Admin initialization
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function importMaterialLinks() {
  try {
    const csvPath = path.join(process.cwd(), 'materials_to_link.csv');
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found at:', csvPath);
      return false;
    }
    
    console.log('Starting to import material links from CSV...');
    
    const materials = [];
    
    // Parse the CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => materials.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`Loaded ${materials.length} materials from CSV`);
    
    // Create a new materials collection in Firestore
    const materialsRef = db.collection('materials');
    
    // Prepare batches (Firestore limits batches to 500 operations)
    const batchSize = 400;
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    let importedCount = 0;
    
    // Process each material
    for (const material of materials) {
      // Skip materials without links
      if (!material.amazonLink && !material.affiliateLink) {
        console.log(`Skipping "${material.name}" - no links provided`);
        continue;
      }
      
      // Create a unique ID for the material
      const materialId = material.normalizedName.replace(/[^a-z0-9]/g, '-');
      
      // Add new material to the batch
      const docRef = materialsRef.doc(materialId);
      currentBatch.set(docRef, {
        name: material.name,
        normalizedName: material.normalizedName,
        amazonLink: material.amazonLink || '',
        affiliateLink: material.affiliateLink || '',
        count: parseInt(material.count) || 0,
        activityIds: material.activityIds ? material.activityIds.split('|') : [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      importedCount++;
      operationCount++;
      
      // If we've reached the batch limit, commit and start a new batch
      if (operationCount >= batchSize) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }
    
    // Add the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }
    
    // Commit all batches
    console.log(`Committing ${batches.length} batches with ${importedCount} materials...`);
    
    if (batches.length === 0) {
      console.log('No materials to import');
      return true;
    }
    
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`Committed batch ${i + 1} of ${batches.length}`);
    }
    
    console.log(`Successfully imported ${importedCount} materials!`);
    return true;
  } catch (error) {
    console.error('Error importing material links:', error);
    return false;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  importMaterialLinks()
    .then(success => {
      if (success) {
        console.log('Material links imported successfully!');
      } else {
        console.error('Failed to import material links');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error during import:', error);
      process.exit(1);
    });
}