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

async function updateMaterialAlternatives() {
  try {
    console.log('Starting to update material alternatives...');
    
    // Get all materials
    const materialsSnapshot = await db.collection('materials').get();
    const batch = db.batch();
    let count = 0;
    
    materialsSnapshot.forEach(doc => {
      const material = doc.data();
      const newAlternative = getHouseholdAlternative(material.name);
      
      // Only update if the alternative has changed
      if (material.householdAlternative !== newAlternative) {
        const materialRef = db.collection('materials').doc(doc.id);
        batch.update(materialRef, { householdAlternative: newAlternative });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`Updated ${count} materials with proper alternatives`);
    } else {
      console.log('No materials needed updating');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating materials:', error);
    process.exit(1);
  }
}

updateMaterialAlternatives(); 