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

async function updateUserPreferences() {
  console.log('Starting user preferences update...');

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Check if preferences object exists
        if (!userData.preferences) {
          // Create new preferences object
          await userDoc.ref.update({
            preferences: {
              emailNotifications: true,
              weeklyDigest: true,
              theme: userData.theme || 'light'
            }
          });
          console.log(`Created preferences for user ${userId}`);
          updatedCount++;
        } else {
          // Update existing preferences
          const currentPreferences = userData.preferences;
          const updatedPreferences = {
            ...currentPreferences,
            emailNotifications: true,
            weeklyDigest: true
          };

          // Only update if changes are needed
          if (currentPreferences.emailNotifications !== true || 
              currentPreferences.weeklyDigest !== true) {
            await userDoc.ref.update({
              preferences: updatedPreferences
            });
            console.log(`Updated preferences for user ${userId}`);
            updatedCount++;
          } else {
            console.log(`Skipped user ${userId} - preferences already set correctly`);
            skippedCount++;
          }
        }
      } catch (error) {
        console.error(`Error updating user ${userDoc.id}:`, error);
        errorCount++;
      }
    }

    console.log('\nUpdate Summary:');
    console.log(`Total users processed: ${usersSnapshot.size}`);
    console.log(`Users updated: ${updatedCount}`);
    console.log(`Users skipped (already correct): ${skippedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Error in updateUserPreferences:', error);
    process.exit(1);
  }

  // Exit successfully
  process.exit(0);
}

// Run the update
updateUserPreferences(); 