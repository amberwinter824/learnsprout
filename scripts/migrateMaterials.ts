import * as admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = getFirestore();

async function migrateMaterials() {
  try {
    // Get all activities to understand material usage
    const activitiesSnapshot = await db.collection('activities').get();
    const activityMaterialsMap = new Map<string, Set<string>>();

    activitiesSnapshot.forEach(doc => {
      const activity = doc.data();
      if (activity.materialsNeeded && Array.isArray(activity.materialsNeeded)) {
        activityMaterialsMap.set(doc.id, new Set(activity.materialsNeeded));
      }
    });

    // Get existing materials
    const materialsSnapshot = await db.collection('materials').get();
    const existingMaterials = new Map<string, any>();

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