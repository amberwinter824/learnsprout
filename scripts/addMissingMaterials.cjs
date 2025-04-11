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

// Helper function to determine material type
function determineMaterialType(name) {
  const lowerName = name.toLowerCase();
  
  // Common household items
  if (lowerName.includes('water') || 
      lowerName.includes('towel') || 
      lowerName.includes('soap') || 
      lowerName.includes('cloth') || 
      lowerName.includes('paper') || 
      lowerName.includes('crayon') || 
      lowerName.includes('scissors') ||
      lowerName.includes('container') ||
      lowerName.includes('bowl') ||
      lowerName.includes('tray') ||
      lowerName.includes('basket')) {
    return 'household';
  }
  
  // Basic Montessori materials
  if (lowerName.includes('sandpaper') || 
      lowerName.includes('number rods') || 
      lowerName.includes('spindle') || 
      lowerName.includes('pink tower') || 
      lowerName.includes('brown stair') || 
      lowerName.includes('red rods') ||
      lowerName.includes('color tablets') ||
      lowerName.includes('sound cylinders') ||
      lowerName.includes('knobbed cylinders')) {
    return 'basic';
  }
  
  // Advanced Montessori materials
  if (lowerName.includes('golden beads') || 
      lowerName.includes('stamp game') || 
      lowerName.includes('checkerboard') || 
      lowerName.includes('binomial cube') || 
      lowerName.includes('trinomial cube') ||
      lowerName.includes('geometric cabinet')) {
    return 'advanced';
  }
  
  return 'other';
}

// Helper function to normalize material name
function normalizeMaterialName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to get household alternative
function getHouseholdAlternative(name) {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('sandpaper letters')) {
    return 'Letters made with glue and sand on cardstock';
  }
  if (lowerName.includes('sandpaper numerals')) {
    return 'Numerals made with glue and sand on cardstock';
  }
  if (lowerName.includes('number rods')) {
    return 'Painted craft sticks bundled in increasing quantities';
  }
  if (lowerName.includes('golden beads')) {
    return 'DIY versions using beads, craft sticks, paper squares';
  }
  if (lowerName.includes('geometric cabinet')) {
    return 'DIY shape templates and insets';
  }
  if (lowerName.includes('knobbed cylinders')) {
    return 'DIY version with different sized containers';
  }
  if (lowerName.includes('binomial cube')) {
    return 'Simplified 3D puzzle with color patterns';
  }
  
  return null;
}

async function addMissingMaterials() {
  try {
    console.log('Starting to add missing materials...');
    
    // Get all activities to understand material usage
    const activitiesSnapshot = await db.collection('activities').get();
    const activityMaterialsMap = new Map();
    
    activitiesSnapshot.forEach(doc => {
      const activity = doc.data();
      if (activity.materialsNeeded && Array.isArray(activity.materialsNeeded)) {
        activityMaterialsMap.set(doc.id, new Set(activity.materialsNeeded));
      }
    });
    
    // Get existing materials to avoid duplicates
    const materialsSnapshot = await db.collection('materials').get();
    const existingMaterials = new Set();
    
    materialsSnapshot.forEach(doc => {
      const material = doc.data();
      existingMaterials.add(material.normalizedName);
      if (material.alternativeNames) {
        material.alternativeNames.forEach(name => existingMaterials.add(normalizeMaterialName(name)));
      }
    });
    
    // Process each activity's materials
    const materialsToAdd = new Map();
    
    for (const [activityId, materials] of activityMaterialsMap) {
      for (const materialName of materials) {
        const normalizedName = normalizeMaterialName(materialName);
        
        if (!existingMaterials.has(normalizedName)) {
          const materialType = determineMaterialType(materialName);
          const householdAlternative = getHouseholdAlternative(materialName);
          
          const newMaterial = {
            name: materialName,
            normalizedName: materialName.toLowerCase().trim(),
            materialType: determineMaterialType(materialName),
            description: '',
            category: 'Other',
            isEssential: false,
            householdAlternative: getHouseholdAlternative(materialName),
            amazonLink: '',
            affiliateLink: '',
            activities: [],
            alternativeNames: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          materialsToAdd.set(normalizedName, newMaterial);
        }
      }
    }
    
    console.log(`Found ${materialsToAdd.size} new materials to add`);
    
    // Add materials to database
    const batch = db.batch();
    let count = 0;
    
    for (const [normalizedName, material] of materialsToAdd) {
      const materialRef = db.collection('materials').doc();
      batch.set(materialRef, material);
      count++;
      
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`Committed batch of ${count} materials`);
        batch = db.batch();
      }
    }
    
    if (count % 500 !== 0) {
      await batch.commit();
      console.log(`Committed final batch of ${count % 500} materials`);
    }
    
    console.log(`Successfully added ${count} new materials to the database`);
    process.exit(0);
  } catch (error) {
    console.error('Error adding materials:', error);
    process.exit(1);
  }
}

addMissingMaterials(); 