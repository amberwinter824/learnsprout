import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '', 'base64').toString()
  );
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const adminDb = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  // Get query params
  const searchParams = request.nextUrl.searchParams;
  const userEmail = searchParams.get('email');
  const childId = searchParams.get('childId');
  
  // Validate required parameters
  if (!userEmail) {
    return NextResponse.json({ error: 'Missing required parameter: email' }, { status: 400 });
  }
  
  try {
    // Calculate the date for next Monday (start of next week)
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
    nextMonday.setHours(0, 0, 0, 0);
    
    // Find the user by email
    const usersSnapshot = await adminDb.collection('users')
      .where('email', '==', userEmail)
      .get();
    
    if (usersSnapshot.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = usersSnapshot.docs[0].data();
    const userId = usersSnapshot.docs[0].id;
    
    // If childId is provided, find that specific child
    // Otherwise, get all active children for the user
    let childrenQuery;
    
    if (childId) {
      childrenQuery = adminDb.collection('children')
        .where('userId', '==', userId)
        .where('__name__', '==', childId)
        .where('active', '==', true);
    } else {
      childrenQuery = adminDb.collection('children')
        .where('userId', '==', userId)
        .where('active', '==', true);
    }
    
    const childrenSnapshot = await childrenQuery.get();
    
    if (childrenSnapshot.empty) {
      return NextResponse.json({ error: 'No active children found for this user' }, { status: 404 });
    }
    
    // Process each child
    const emailResults = [];
    
    for (const childDoc of childrenSnapshot.docs) {
      const childData = childDoc.data();
      const childId = childDoc.id;
      
      // Get the weekly plan for next week
      const nextMondayTimestamp = new Date(nextMonday);
      
      const plansSnapshot = await adminDb.collection('weeklyPlans')
        .where('childId', '==', childId)
        .where('weekStarting', '==', nextMondayTimestamp)
        .get();
      
      let weeklyPlanData;
      
      if (!plansSnapshot.empty) {
        // Use existing plan
        weeklyPlanData = plansSnapshot.docs[0].data();
      } else {
        // Create a dummy weekly plan for testing
        weeklyPlanData = {
          childId,
          userId,
          weekStarting: nextMondayTimestamp,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          monday: [
            {
              activityId: 'testActivity1',
              timeSlot: 'morning',
              status: 'suggested',
              order: 0
            }
          ],
          tuesday: [
            {
              activityId: 'testActivity2',
              timeSlot: 'afternoon',
              status: 'suggested',
              order: 0
            }
          ],
          wednesday: [
            {
              activityId: 'testActivity3',
              timeSlot: 'morning',
              status: 'suggested',
              order: 0
            }
          ],
          thursday: [],
          friday: [
            {
              activityId: 'testActivity4',
              timeSlot: 'afternoon',
              status: 'suggested',
              order: 0
            }
          ],
          saturday: [],
          sunday: []
        };
      }
      
      // Get activity details
      const activityIds = new Set<string>();
      
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
        if (weeklyPlanData[day] && Array.isArray(weeklyPlanData[day])) {
          weeklyPlanData[day].forEach((activity: any) => {
            if (activity && activity.activityId) {
              activityIds.add(activity.activityId);
            }
          });
        }
      });
      
      // Fetch real activity details or use dummy data
      const activitiesDetails: Record<string, any> = {};
      
      for (const activityId of activityIds) {
        // Try to get real activity
        try {
          const activityDoc = await adminDb.collection('activities').doc(activityId).get();
          
          if (activityDoc.exists) {
            activitiesDetails[activityId] = activityDoc.data();
          } else {
            // Use dummy data
            activitiesDetails[activityId] = {
              title: `Test Activity ${activityId}`,
              description: 'This is a test activity for the weekly plan email',
              area: 'Practical Life',
              difficulty: 'beginner'
            };
          }
        } catch (error) {
          console.error(`Error fetching activity ${activityId}:`, error);
          // Use dummy data on error
          activitiesDetails[activityId] = {
            title: `Test Activity ${activityId}`,
            description: 'This is a test activity for the weekly plan email',
            area: 'Practical Life',
            difficulty: 'beginner'
          };
        }
      }
      
      // Generate the email HTML
      const emailHtml = generateWeeklyPlanEmailHtml(
        userData.displayName || userData.name || 'Parent',
        childData.name,
        nextMonday,
        weeklyPlanData,
        activitiesDetails
      );
      
      // Send the email
      try {
        const { data, error } = await resend.emails.send({
          from: 'Learn Sprout <weekly@updates.learn-sprout.com>',
          to: userEmail,
          subject: `${childData.name}'s Weekly Plan: ${nextMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(nextMonday.getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
          html: emailHtml
        });
        
        if (error) {
          emailResults.push({
            childId,
            childName: childData.name,
            success: false,
            error: error.message
          });
        } else {
          emailResults.push({
            childId,
            childName: childData.name,
            success: true,
            emailId: data?.id
          });
        }
      } catch (sendError: any) {
        emailResults.push({
          childId,
          childName: childData.name,
          success: false,
          error: sendError.message || 'Unknown error sending email'
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test emails sent',
      results: emailResults
    });
    
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

/**
 * Generates HTML content for the weekly plan email
 */
function generateWeeklyPlanEmailHtml(
  userName: string,
  childName: string,
  weekStartingDate: Date,
  weeklyPlanData: any,
  activitiesDetails: Record<string, any>
): string {
  // Format the week dates
  const weekStart = new Date(weekStartingDate);
  const weekEnd = new Date(weekStartingDate);
  weekEnd.setDate(weekEnd.getDate() + 4); // Monday to Friday
  
  const dateOptions: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  const weekRangeText = `${weekStart.toLocaleDateString('en-US', dateOptions)} - ${weekEnd.toLocaleDateString('en-US', dateOptions)}`;

  // Generate the activities HTML for each day
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  
  let activitiesHtml = '';
  
  daysOfWeek.forEach(day => {
    const dayDate = new Date(weekStartingDate);
    dayDate.setDate(dayDate.getDate() + daysOfWeek.indexOf(day));
    const formattedDay = dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    
    activitiesHtml += `
      <div style="margin-bottom: 25px;">
        <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
          ${formattedDay}
        </h3>
    `;
    
    const dayActivities = weeklyPlanData[day] || [];
    
    if (dayActivities.length === 0) {
      activitiesHtml += `<p style="color: #6b7280; font-style: italic; margin: 0;">No activities scheduled</p>`;
    } else {
      dayActivities.forEach((activity: any) => {
        const activityDetails = activitiesDetails[activity.activityId] || {};
        const timeSlot = activity.timeSlot === 'morning' ? 'Morning' : 'Afternoon';
        
        activitiesHtml += `
          <div style="background-color: #f9fafb; border-left: 3px solid #059669; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-weight: 500; color: #111827;">${activityDetails.title || 'Activity'}</span>
              <span style="color: #6b7280; font-size: 14px;">${timeSlot}</span>
            </div>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">${activityDetails.description || ''}</p>
            <div style="margin-top: 8px;">
              <span style="background-color: #d1fae5; color: #065f46; font-size: 12px; padding: 3px 8px; border-radius: 12px;">${activityDetails.area || 'General'}</span>
              ${activityDetails.difficulty ? `<span style="background-color: #e0f2fe; color: #0369a1; font-size: 12px; padding: 3px 8px; border-radius: 12px; margin-left: 5px;">${activityDetails.difficulty}</span>` : ''}
            </div>
          </div>
        `;
      });
    }
    
    activitiesHtml += `</div>`;
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://learnsprout.vercel.app/icons/icon-192x192.png" alt="Learn Sprout Logo" style="height: 40px; margin-bottom: 20px;">
        <h1 style="color: #059669; margin: 0; font-size: 24px;">${childName}'s Weekly Plan</h1>
        <p style="color: #4b5563; margin: 10px 0 0 0;">Week of ${weekRangeText}</p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">Hi ${userName},</p>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">
          Here is ${childName}'s learning plan for next week. These activities have been selected based on ${childName}'s
          current skills and interests.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.5;">
          You can modify this plan anytime on the Learn Sprout platform.
        </p>
      </div>
      
      <div style="margin: 30px 0;">
        ${activitiesHtml}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://learnsprout.vercel.app/dashboard/weekly-plans" 
           style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
          View Full Plan
        </a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          If you'd like to adjust your email preferences, please visit your <a href="https://learnsprout.vercel.app/settings" style="color: #059669; text-decoration: none;">account settings</a>.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px;">
          Sent by Learn Sprout • <a href="https://learnsprout.vercel.app" style="color: #059669; text-decoration: none;">Visit Website</a>
        </p>
      </div>
    </div>
  `;
} 