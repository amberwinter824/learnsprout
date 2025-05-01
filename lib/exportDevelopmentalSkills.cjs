// exportDevelopmentalSkills.cjs
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin with environment variables
console.log('Initializing Firebase Admin...');
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  process.exit(1);
}

const db = admin.firestore();

async function exportSkills() {
  console.log('Starting export of developmental skills...');
  try {
    const skillsRef = db.collection('developmentalSkills');
    console.log('Fetching skills from Firestore...');
    const snapshot = await skillsRef.get();
    console.log(`Found ${snapshot.size} skills`);

    const rows = [
      ['skillId', 'skillName', 'asqDomain', 'area', 'ageRanges', 'prerequisites']
    ];

    snapshot.forEach(doc => {
      const data = doc.data();
      rows.push([
        doc.id,
        data.name || '',
        data.asqDomain || '',
        data.area || '',
        (data.ageRanges || []).join(';'),
        (data.prerequisites || []).join(';')
      ]);
    });

    // Write to CSV
    const csv = rows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    fs.writeFileSync('developmental_skills_export.csv', csv);
    console.log('Exported to developmental_skills_export.csv');
    return true;
  } catch (error) {
    console.error('Error exporting skills:', error);
    throw error;
  }
}

exportSkills()
  .then(result => {
    console.log('Export completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Export failed:', error);
    process.exit(1);
  }); 