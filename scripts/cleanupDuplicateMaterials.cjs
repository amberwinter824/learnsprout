require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const stringSimilarity = require('string-similarity');

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

// Helper function to normalize material name
function normalizeMaterialName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(small|large|big|tiny|mini)\b/g, '') // Remove size descriptors
    .replace(/\b(for|with|and|or|the|a|an)\b/g, '') // Remove common words
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Helper function to find similar materials
function findSimilarMaterials(materials, threshold = 0.7) { // Lower threshold to catch more matches
  const similarGroups = new Map();
  const processed = new Set();
  
  for (let i = 0; i < materials.length; i++) {
    if (processed.has(i)) continue;
    
    const current = materials[i];
    const currentNormalized = normalizeMaterialName(current.name);
    const similarToCurrent = [i];
    
    for (let j = i + 1; j < materials.length; j++) {
      if (processed.has(j)) continue;
      
      const other = materials[j];
      const otherNormalized = normalizeMaterialName(other.name);
      
      // Check if materials are similar
      const similarity = stringSimilarity.compareTwoStrings(currentNormalized, otherNormalized);
      
      // Also check if one name contains the other
      const containsMatch = currentNormalized.includes(otherNormalized) || 
                          otherNormalized.includes(currentNormalized);
      
      if (similarity >= threshold || containsMatch) {
        similarToCurrent.push(j);
        processed.add(j);
      }
    }
    
    if (similarToCurrent.length > 1) {
      similarGroups.set(i, similarToCurrent);
    }
    
    processed.add(i);
  }
  
  return similarGroups;
}

// Helper function to choose the best name from similar materials
function chooseBestName(materials) {
  // Prefer names that are more specific but not too long
  return materials.reduce((best, current) => {
    const currentWords = current.name.split(/\s+/).length;
    const bestWords = best.name.split(/\s+/).length;
    
    // If current name is more specific (has more words) but not too long
    if (currentWords > bestWords && currentWords <= 5) {
      return current;
    }
    return best;
  });
}

async function cleanupDuplicateMaterials() {
  try {
    console.log('Starting to clean up duplicate materials...');
    
    // Get all materials
    const materialsSnapshot = await db.collection('materials').get();
    const materials = materialsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${materials.length} materials to analyze`);
    
    // Find similar materials
    const similarGroups = findSimilarMaterials(materials);
    console.log(`Found ${similarGroups.size} groups of similar materials`);
    
    // Process each group
    const batch = db.batch();
    const materialsToDelete = new Set();
    let count = 0;
    
    for (const [mainIndex, similarIndices] of similarGroups) {
      const mainMaterial = materials[mainIndex];
      const similarMaterials = similarIndices.map(i => materials[i]);
      
      // Choose the best name
      const bestMaterial = chooseBestName(similarMaterials);
      
      // Collect all alternative names
      const alternativeNames = similarMaterials
        .map(m => m.name)
        .filter(name => name !== bestMaterial.name);
      
      // Collect all activities
      const allActivities = new Set();
      similarMaterials.forEach(m => {
        if (m.activities) {
          m.activities.forEach(activity => allActivities.add(activity));
        }
      });
      
      // Update the main material
      const materialRef = db.collection('materials').doc(bestMaterial.id);
      batch.update(materialRef, {
        alternativeNames: Array.from(allActivities),
        activityCount: allActivities.size
      });
      
      // Mark other materials for deletion
      similarMaterials.forEach(m => {
        if (m.id !== bestMaterial.id) {
          materialsToDelete.add(m.id);
        }
      });
      
      count++;
      
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`Committed batch of ${count} updates`);
        batch = db.batch();
      }
    }
    
    // Delete duplicate materials
    for (const materialId of materialsToDelete) {
      const materialRef = db.collection('materials').doc(materialId);
      batch.delete(materialRef);
    }
    
    if (count % 500 !== 0 || materialsToDelete.size > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${count % 500} updates and ${materialsToDelete.size} deletions`);
    }
    
    console.log(`Successfully cleaned up ${materialsToDelete.size} duplicate materials`);
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up materials:', error);
    process.exit(1);
  }
}

cleanupDuplicateMaterials(); 