// exportDevelopmentalSkills.js
import admin from 'firebase-admin';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Initializing Firebase Admin...');
try {
  // Initialize with application default credentials or google cloud auth
  // This assumes Firebase Admin is initialized elsewhere or you're using Google Cloud credentials
  if (admin.apps.length === 0) {
    admin.initializeApp({
      // You can add a projectId if needed
      projectId: 'learnsprout-dev' // Replace with your actual project ID
    });
  }
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