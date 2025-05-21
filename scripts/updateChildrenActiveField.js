import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import admin from 'firebase-admin';

// Initialize Firebase Admin using environment variables from .env.local
const firebaseConfig = {
  type: "service_account",
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
};

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_ADMIN_PRIVATE_KEY_ID',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_CLIENT_ID',
  'FIREBASE_ADMIN_CLIENT_X509_CERT_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});

const db = admin.firestore();

async function updateChildrenActiveField() {
  console.log('Starting children active field update...');

  try {
    const childrenSnapshot = await db.collection('children').get();
    console.log(`Found ${childrenSnapshot.size} children in total.`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const childDoc of childrenSnapshot.docs) {
      try {
        const childData = childDoc.data();
        const childId = childDoc.id;
        const currentActive = childData.active;

        // Update if missing or not boolean true
        if (currentActive !== true) {
          await childDoc.ref.update({ active: true });
          console.log(`Updated child ${childId}: set active = true (was: ${JSON.stringify(currentActive)})`);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error updating child ${childDoc.id}:`, error);
        errorCount++;
      }
    }

    console.log('\nUpdate Summary:');
    console.log(`Total children processed: ${childrenSnapshot.size}`);
    console.log(`Children updated: ${updatedCount}`);
    console.log(`Children skipped (already correct): ${skippedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
  } catch (error) {
    console.error('Error in updateChildrenActiveField:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateChildrenActiveField(); 