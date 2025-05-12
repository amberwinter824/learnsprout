import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { generateWeeklyPlanEmailHtml } from '@/lib/emailService';
import { generateWeeklyPlan } from '@/lib/planGenerator';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    // Get all users with email notifications and weekly digest enabled
    const usersSnapshot = await db
      .collection('users')
      .where('preferences.emailNotifications', '==', true)
      .where('preferences.weeklyDigest', '==', true)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({ message: 'No users found with email notifications and weekly digest enabled' });
    }

    const emailPromises: Promise<void>[] = [];
    const results = {
      totalUsers: usersSnapshot.size,
      emailsSent: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userEmail = userData.email;
      const userName = userData.displayName || userData.name || 'Parent';

      // Get active children for this user
      const childrenSnapshot = await db
        .collection('children')
        .where('userId', '==', userDoc.id)
        .where('status', '==', 'active')
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
          // Calculate next Monday's date
          const today = new Date();
          const nextMonday = new Date(today);
          nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
          nextMonday.setHours(0, 0, 0, 0);

          // Generate a weekly plan for the child
          const weeklyPlan = await generateWeeklyPlan(childDoc.id, userDoc.id, nextMonday);
          
          // Get activity details for all activities in the plan
          const activitiesDetails: Record<string, any> = {};
          const activityIds = new Set<string>();
          
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
            weeklyPlan[day].forEach((activity: any) => {
              activityIds.add(activity.activityId);
            });
          });

          // Fetch activity details
          for (const activityId of activityIds) {
            const activityDoc = await db.collection('activities').doc(activityId).get();
            if (activityDoc.exists) {
              activitiesDetails[activityId] = activityDoc.data();
            }
          }

          // Send email
          const emailHtml = generateWeeklyPlanEmailHtml(
            userName,
            childName,
            nextMonday,
            weeklyPlan,
            activitiesDetails
          );

          await resend.emails.send({
            from: 'Learn Sprout <weekly@updates.learn-sprout.com>',
            to: userEmail,
            subject: `${childName}'s Weekly Plan: ${nextMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(nextMonday.getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
            html: emailHtml,
          });

          results.emailsSent++;
          console.log(`Successfully sent weekly plan email to ${userEmail} for child ${childName}`);
        } catch (error) {
          const errorMessage = `Failed to process weekly plan for ${childName}: ${error}`;
          console.error(errorMessage);
          results.errors.push(errorMessage);
        }
      }
    }

    return NextResponse.json({
      message: 'Weekly email test completed',
      results,
    });
  } catch (error) {
    console.error('Error in test-weekly-email:', error);
    return NextResponse.json(
      { error: 'Failed to process weekly emails', details: error },
      { status: 500 }
    );
  }
} 