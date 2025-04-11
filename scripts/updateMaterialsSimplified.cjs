const { config } = require('dotenv');
const admin = require('firebase-admin');
const { isCommonHouseholdItem, getHouseholdAlternative } = require('../lib/materialsData.cjs');
const { FieldValue } = require('firebase-admin/firestore');

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const adminDb = admin.firestore();

// List of advanced Montessori materials
const ADVANCED_MATERIALS = [
  'binomial cube',
  'trinomial cube',
  'geometric cabinet',
  'golden bead',
  'metal insets',
  'pink tower',
  'brown stair',
  'red rods',
  'cylinder blocks',
  'geometric solids',
  'baric tablets',
  'thermic tablets',
  'sound boxes',
  'color grading',
  'knobless cylinders'
];

// Function to normalize material names
function normalizeMaterialName(name) {
  return name
    .toLowerCase()
    // Remove quantity prefixes like "2", "two", etc.
    .replace(/^(\d+|one|two|three|four|five)\s+/, '')
    // Remove "small", "large", etc. if followed by another word
    .replace(/(small|large|medium)\s+(?=\w)/, '')
    // Standardize common terms
    .replace(/container(s)?/, 'container')
    .replace(/pitcher(s)?/, 'pitcher')
    .replace(/basket(s)?/, 'basket')
    .replace(/tray(s)?/, 'tray')
    .trim();
}

// Function to merge similar materials
function mergeSimilarMaterials(materials) {
  const normalizedMap = new Map();
  
  materials.forEach(material => {
    const normalizedName = normalizeMaterialName(material.name);
    
    if (!normalizedMap.has(normalizedName)) {
      normalizedMap.set(normalizedName, {
        ...material,
        alternativeNames: [material.name]
      });
    } else {
      const existing = normalizedMap.get(normalizedName);
      // Keep the shorter name as the primary name
      if (material.name.length < existing.name.length) {
        existing.name = material.name;
      }
      existing.alternativeNames.push(material.name);
      // Merge other properties if they exist
      if (material.description && !existing.description) {
        existing.description = material.description;
      }
      if (material.amazonLink && !existing.amazonLink) {
        existing.amazonLink = material.amazonLink;
      }
      if (material.imageUrl && !existing.imageUrl) {
        existing.imageUrl = material.imageUrl;
      }
    }
  });
  
  return Array.from(normalizedMap.values());
}

async function updateMaterialsSimplified() {
  try {
    console.log('Starting materials simplification update...');
    
    // Get all materials from Firestore
    const materialsSnapshot = await adminDb.collection('materials').get();
    const allMaterials = materialsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Merge similar materials
    const mergedMaterials = mergeSimilarMaterials(allMaterials);
    
    // Create a batch for updates
    const batch = adminDb.batch();
    let updateCount = 0;
    let deleteCount = 0;
    
    // Keep track of documents to delete
    const toDelete = new Set(materialsSnapshot.docs.map(doc => doc.id));
    
    mergedMaterials.forEach(material => {
      const materialRef = adminDb.collection('materials').doc(material.id);
      toDelete.delete(material.id); // Remove this doc from deletion set
      
      // Determine material type
      let materialType = 'basic'; // Default
      
      // If it's a household item
      if (isCommonHouseholdItem(material.name)) {
        materialType = 'household';
      } 
      // Check if it's an advanced material
      else if (ADVANCED_MATERIALS.some(term => 
        material.name.toLowerCase().includes(term.toLowerCase())
      )) {
        materialType = 'advanced';
      }
      
      // Create simplified material structure
      const simplifiedMaterial = {
        // Essential fields
        name: material.name,
        description: material.description || '',
        materialType,
        category: material.category || 'Other',
        alternativeNames: material.alternativeNames || [material.name],
        
        // Only include householdAlternative for basic/advanced materials
        ...(materialType !== 'household' && { 
          householdAlternative: getHouseholdAlternative(material.name) 
        }),
        
        // Optional fields (only include if they exist)
        ...(material.amazonLink && { amazonLink: material.amazonLink }),
        ...(material.imageUrl && { imageUrl: material.imageUrl }),
        
        // Timestamp
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Update the document with simplified structure
      batch.update(materialRef, simplifiedMaterial);
      
      updateCount++;
      console.log(`Updated material: ${material.name} (${materialType})`);
    });
    
    // Delete duplicate documents
    toDelete.forEach(docId => {
      const docRef = adminDb.collection('materials').doc(docId);
      batch.delete(docRef);
      deleteCount++;
    });
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully updated ${updateCount} materials and deleted ${deleteCount} duplicates!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating materials:', error);
    process.exit(1);
  }
}

// Run the update
updateMaterialsSimplified(); 