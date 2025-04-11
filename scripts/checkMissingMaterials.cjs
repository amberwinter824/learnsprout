require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
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

const db = admin.firestore();

async function checkMissingMaterials() {
  try {
    console.log('Starting to check for missing materials...');
    
    // Get all activities
    const activitiesSnapshot = await db.collection('activities').get();
    const allMaterialsFromActivities = new Set();
    
    // Collect all unique material names from activities
    activitiesSnapshot.forEach(doc => {
      const activity = doc.data();
      if (activity.materialsNeeded && Array.isArray(activity.materialsNeeded)) {
        activity.materialsNeeded.forEach(material => {
          if (material) {
            allMaterialsFromActivities.add(material.trim().toLowerCase());
          }
        });
      }
    });
    
    console.log(`Found ${allMaterialsFromActivities.size} unique materials in activities`);
    
    // Get all materials from our database
    const materialsSnapshot = await db.collection('materials').get();
    const materialsInDatabase = new Set();
    const materialNames = new Map(); // Store original names for reference
    
    materialsSnapshot.forEach(doc => {
      const material = doc.data();
      const normalizedName = material.normalizedName || material.name.toLowerCase().trim();
      materialsInDatabase.add(normalizedName);
      materialNames.set(normalizedName, material.name);
      
      // Also check alternative names
      if (material.alternativeNames && Array.isArray(material.alternativeNames)) {
        material.alternativeNames.forEach(altName => {
          materialsInDatabase.add(altName.trim().toLowerCase());
        });
      }
    });
    
    console.log(`Found ${materialsInDatabase.size} materials in database`);
    
    // Find missing materials
    const missingMaterials = [];
    for (const material of allMaterialsFromActivities) {
      if (!materialsInDatabase.has(material)) {
        missingMaterials.push(material);
      }
    }
    
    if (missingMaterials.length > 0) {
      console.log('\nMissing materials:');
      missingMaterials.forEach(material => {
        console.log(`- ${material}`);
      });
      
      // Find activities that use these missing materials
      console.log('\nActivities using missing materials:');
      activitiesSnapshot.forEach(doc => {
        const activity = doc.data();
        if (activity.materialsNeeded && Array.isArray(activity.materialsNeeded)) {
          const missingInActivity = activity.materialsNeeded.filter(material => 
            missingMaterials.includes(material.trim().toLowerCase())
          );
          if (missingInActivity.length > 0) {
            console.log(`\nActivity: ${activity.title || 'Untitled Activity'} (${doc.id})`);
            console.log('Missing materials:', missingInActivity.join(', '));
          }
        }
      });
    } else {
      console.log('\nNo missing materials found! All materials from activities are in the database.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking materials:', error);
    process.exit(1);
  }
}

checkMissingMaterials(); 