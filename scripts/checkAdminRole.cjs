const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
try {
  if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    console.error('Missing environment variables for Firebase Admin');
    process.exit(1);
  }
  
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  process.exit(1);
}

const db = getFirestore();
const auth = getAuth();

async function checkAdminRole(email) {
  try {
    // Find user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log('\nFirebase Auth User:', {
      uid: userRecord.uid,
      email: userRecord.email,
      customClaims: userRecord.customClaims
    });

    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('\nFirestore User Data:', {
        role: userData.role,
        activeRole: userData.activeRole,
        associatedRoles: userData.associatedRoles
      });
    } else {
      console.log('\nNo Firestore document found for this user');
    }

  } catch (error) {
    console.error('Error checking admin role:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Usage: node checkAdminRole.cjs <email>');
  process.exit(1);
}

checkAdminRole(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 