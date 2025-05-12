import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { generateWeeklyPlanEmailHtml } from '@/lib/emailService';

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

        // Calculate next Monday's date
        const today = new Date();
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
        nextMonday.setHours(0, 0, 0, 0);

        // Get or create weekly plan
        const weeklyPlanRef = db.collection('weeklyPlans').doc();
        const weeklyPlanData = {
          childId: childDoc.id,
          userId: userDoc.id,
          weekStarting: nextMonday,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        };

        await weeklyPlanRef.set(weeklyPlanData);

        // Get some sample activities for the email
        const activitiesDetails: Record<string, any> = {
          'activity1': {
            title: 'Color Sorting',
            description: 'Sort objects by their colors to develop visual discrimination skills.',
            area: 'Sensorial',
            difficulty: 'beginner'
          },
          'activity2': {
            title: 'Pouring Practice',
            description: 'Practice pouring between containers using water or dry materials.',
            area: 'Practical Life',
            difficulty: 'beginner'
          }
        };

        // Send email
        try {
          const emailHtml = generateWeeklyPlanEmailHtml(
            userName,
            childName,
            nextMonday,
            weeklyPlanData,
            activitiesDetails
          );
          await resend.emails.send({
            from: 'Learn Sprout <noreply@learnsprout.app>',
            to: userEmail,
            subject: `Weekly Learning Plan for ${childName}`,
            html: emailHtml,
          });
          results.emailsSent++;
        } catch (error) {
          results.errors.push(`Failed to send email to ${userEmail} for child ${childName}: ${error}`);
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
      { error: 'Failed to process weekly emails' },
      { status: 500 }
    );
  }
} 