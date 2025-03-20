import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read materials data
const materialsData = JSON.parse(readFileSync(join(__dirname, '../materials_to_link.json'), 'utf8'));

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL,
  universe_domain: "googleapis.com"
};

// Verify we have all required Firebase config
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_ADMIN_PRIVATE_KEY_ID',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_CLIENT_ID',
  'FIREBASE_ADMIN_CLIENT_X509_CERT_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

console.log('Firebase config loaded successfully');

// Initialize the app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateActivitiesWithMaterials() {
  try {
    // Create a map of activities to their materials
    const activityMaterialsMap = new Map();

    // Process each material and its associated activities
    materialsData.forEach(material => {
      material.activities.forEach(activity => {
        if (!activityMaterialsMap.has(activity.id)) {
          activityMaterialsMap.set(activity.id, new Set());
        }
        activityMaterialsMap.get(activity.id).add(material.name);
      });
    });

    console.log(`Found ${activityMaterialsMap.size} activities to update`);

    // Update each activity with its materials
    for (const [activityId, materials] of activityMaterialsMap) {
      try {
        const materialsArray = Array.from(materials);
        console.log(`Updating activity ${activityId} with materials:`, materialsArray);
        await db.collection('activities').doc(activityId).update({
          materialsNeeded: materialsArray
        });
        console.log(`Updated activity ${activityId} with ${materials.size} materials`);
      } catch (error) {
        console.error(`Error updating activity ${activityId}:`, error);
      }
    }

    console.log('Finished updating activities with materials');
    process.exit(0);
  } catch (error) {
    console.error('Error updating activities:', error);
    process.exit(1);
  }
}

// Run the update
updateActivitiesWithMaterials(); 