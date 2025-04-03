const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin with service account
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
};

initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

async function migrateMaterials() {
  try {
    // Get all activities to understand material usage
    const activitiesSnapshot = await db.collection('activities').get();
    const activityMaterialsMap = new Map();

    activitiesSnapshot.forEach(doc => {
      const activity = doc.data();
      if (activity.materialsNeeded && Array.isArray(activity.materialsNeeded)) {
        activityMaterialsMap.set(doc.id, new Set(activity.materialsNeeded));
      }
    });

    // Get existing materials
    const materialsSnapshot = await db.collection('materials').get();
    const existingMaterials = new Map();

    materialsSnapshot.forEach(doc => {
      existingMaterials.set(doc.id, doc.data());
    });

    // Process each material
    for (const [materialId, materialData] of existingMaterials) {
      const normalizedName = materialData.name.toLowerCase().trim();
      
      // Find all activities using this material
      const usedInActivities = Array.from(activityMaterialsMap.entries())
        .filter(([_, materials]) => materials.has(normalizedName))
        .map(([activityId]) => activityId);

      // Create new material structure
      const newMaterialData = {
        name: materialData.name,
        normalizedName,
        category: materialData.category || 'Other',
        description: materialData.description || '',
        quantity: 1, // Default to 1, can be updated later
        unit: 'piece', // Default unit
        isReusable: true, // Default to true, can be updated later
        isOptional: false, // Default to false, can be updated later
        amazonLink: materialData.amazonLink || '',
        affiliateLink: materialData.affiliateLink || '',
        activities: usedInActivities,
        alternativeNames: [] // Can be populated later
      };

      // Update the material document
      await db.collection('materials').doc(materialId).update(newMaterialData);
      console.log(`Updated material: ${materialData.name}`);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrateMaterials(); 