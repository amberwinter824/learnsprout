import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { generateWeeklyPlanEmailHtml } from '@/lib/emailService';
import { generateWeeklyPlan } from '@/lib/planGenerator';

// Debug environment variables
const envDebug = {
  hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  firebaseKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
  hasResendKey: !!process.env.RESEND_API_KEY,
  resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
  environment: process.env.NODE_ENV,
  // Add first few characters of keys for debugging (safely)
  firebaseKeyPreview: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.substring(0, 10) + '...',
  resendKeyPreview: process.env.RESEND_API_KEY?.substring(0, 10) + '...'
};

console.log('Environment Debug:', envDebug);

// Initialize Firebase Admin
let adminDb: any = null;
let initializationError: string | null = null;

try {
  console.log('Starting Firebase initialization...');
  if (!getApps().length) {
    console.log('No existing Firebase apps, initializing new app...');
    // Check if Firebase service account key exists
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      initializationError = 'Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable';
      console.error(initializationError);
    } else {
      try {
        console.log('Attempting to decode Firebase service account key...');
        // Try to decode and parse the service account
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString();
        console.log('Successfully decoded Firebase key, length:', decoded.length);
        
        console.log('Attempting to parse service account JSON...');
        const serviceAccount = JSON.parse(decoded);
        console.log('Successfully parsed service account, keys:', Object.keys(serviceAccount));
        
        console.log('Initializing Firebase app...');
        // Initialize Firebase with the service account
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log('Firebase app initialized successfully');
        
        console.log('Getting Firestore instance...');
        adminDb = getFirestore();
        console.log('Firestore instance obtained successfully');
      } catch (error: any) {
        initializationError = `Error initializing Firebase: ${error.message}`;
        console.error('Firebase initialization error:', error);
        console.error('Error stack:', error.stack);
      }
    }
  } else {
    console.log('Firebase app already exists, getting Firestore instance...');
    adminDb = getFirestore();
    console.log('Firestore instance obtained successfully');
  }
} catch (error: any) {
  initializationError = `Unexpected initialization error: ${error.message}`;
  console.error('Unexpected error during initialization:', error);
  console.error('Error stack:', error.stack);
}

// Initialize Resend
console.log('Initializing Resend...');
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('Resend initialized successfully');

export async function GET() {
  console.log('GET request received, checking initialization status...');
  // Return detailed initialization status if there's an error
  if (initializationError || !adminDb) {
    console.log('Initialization error detected:', initializationError);
    console.log('Admin DB status:', !!adminDb);
    return NextResponse.json({ 
      error: 'Services not properly initialized',
      details: {
        message: initializationError || 'Unknown initialization error',
        firebaseInitialized: !!adminDb,
        resendInitialized: !!resend,
        environment: process.env.NODE_ENV,
        hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
        hasResendKey: !!process.env.RESEND_API_KEY,
        envDebug
      }
    }, { status: 500 });
  }

  try {
    // Get all users with email notifications and weekly digest enabled
    console.log('Fetching users with email notifications enabled...');
    const usersSnapshot = await adminDb
      .collection('users')
      .where('preferences.emailNotifications', '==', true)
      .where('preferences.weeklyDigest', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('No users found with email notifications and weekly digest enabled');
      return NextResponse.json({ message: 'No users found with email notifications and weekly digest enabled' });
    }

    console.log(`Found ${usersSnapshot.size} users with email notifications enabled`);
    const emailPromises: Promise<void>[] = [];
    const results = {
      totalUsers: usersSnapshot.size,
      emailsSent: 0,
      errors: [] as string[],
      permissionsErrors: [] as string[],
      collectionAccess: {
        users: true,
        children: false,
        activities: false,
        weeklyPlans: false
      }
    };

    // Test collection access
    try {
      await adminDb.collection('children').limit(1).get();
      results.collectionAccess.children = true;
    } catch (error: any) {
      console.error('Error accessing children collection:', error);
      results.permissionsErrors.push(`Cannot access children collection: ${error.message}`);
    }

    try {
      await adminDb.collection('activities').limit(1).get();
      results.collectionAccess.activities = true;
    } catch (error: any) {
      console.error('Error accessing activities collection:', error);
      results.permissionsErrors.push(`Cannot access activities collection: ${error.message}`);
    }

    try {
      await adminDb.collection('weeklyPlans').limit(1).get();
      results.collectionAccess.weeklyPlans = true;
    } catch (error: any) {
      console.error('Error accessing weeklyPlans collection:', error);
      results.permissionsErrors.push(`Cannot access weeklyPlans collection: ${error.message}`);
    }

    // If we can't access required collections, return early
    if (results.permissionsErrors.length > 0) {
      return NextResponse.json({
        error: 'Missing required collection access',
        details: {
          collectionAccess: results.collectionAccess,
          permissionsErrors: results.permissionsErrors
        }
      }, { status: 403 });
    }

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userEmail = userData.email;
      const userName = userData.displayName || userData.name || 'Parent';

      console.log(`Processing user ${userEmail}...`);

      // Get active children for this user
      const childrenSnapshot = await adminDb
        .collection('children')
        .where('userId', '==', userDoc.id)
        .where('active', '==', true)
        .get();

      if (childrenSnapshot.empty) {
        results.errors.push(`No active children found for user ${userEmail}`);
        continue;
      }

      // Process each child
      for (const childDoc of childrenSnapshot.docs) {
        const childData = childDoc.data();
        const childName = childData.name;

        try {
          console.log(`Generating plan for child ${childName} (${childDoc.id})...`);
          // Calculate next Monday's date
          const today = new Date();
          const nextMonday = new Date(today);
          nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
          nextMonday.setHours(0, 0, 0, 0);

          // Generate a weekly plan for the child
          const weeklyPlan = await generateWeeklyPlan(childDoc.id, userDoc.id, nextMonday);
          console.log(`Weekly plan generated for ${childName}`);
          
          // Get activity details for all activities in the plan
          const activitiesDetails: Record<string, any> = {};
          const activityIds = new Set<string>();
          
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
            weeklyPlan[day].forEach((activity: any) => {
              activityIds.add(activity.activityId);
            });
          });

          console.log(`Fetching details for ${activityIds.size} activities...`);
          // Fetch activity details
          for (const activityId of activityIds) {
            try {
              console.log(`Fetching activity ${activityId}...`);
              const activityDoc = await adminDb.collection('activities').doc(activityId).get();
              if (activityDoc.exists) {
                activitiesDetails[activityId] = activityDoc.data();
                console.log(`Successfully fetched activity ${activityId}`);
              } else {
                console.log(`Activity ${activityId} not found`);
              }
            } catch (error: any) {
              console.error(`Error fetching activity ${activityId}:`, error);
              throw new Error(`Failed to fetch activity ${activityId}: ${error.message}`);
            }
          }

          console.log(`Generating email HTML for ${childName}...`);
          // Send email
          const emailHtml = generateWeeklyPlanEmailHtml(
            userName,
            childName,
            nextMonday,
            weeklyPlan,
            activitiesDetails
          );

          console.log(`Sending email to ${userEmail}...`);
          const { data, error } = await resend.emails.send({
            from: 'Learn Sprout <weekly@updates.learn-sprout.com>',
            to: userEmail,
            subject: `${childName}'s Weekly Plan: ${nextMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(nextMonday.getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
            html: emailHtml,
          });

          if (error) {
            throw error;
          }

          results.emailsSent++;
          console.log(`Successfully sent weekly plan email to ${userEmail} for child ${childName}`);
        } catch (error: any) {
          const errorMessage = `Failed to process weekly plan for ${childName}: ${error.message}`;
          console.error(errorMessage);
          console.error('Error stack:', error.stack);
          results.errors.push(errorMessage);
        }
      }
    }

    return NextResponse.json({
      message: 'Weekly email test completed',
      results,
    });
  } catch (error: any) {
    console.error('Error in test-weekly-email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process weekly emails', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 