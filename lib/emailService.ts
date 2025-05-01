import { Resend } from 'resend';

// Only initialize Resend on the server side
const resend = typeof window === 'undefined' ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendFamilyInvitationEmail(
  recipientEmail: string,
  inviteUrl: string,
  familyName: string,
  inviterName: string
) {
  if (!resend) {
    throw new Error('Email service can only be used on the server side');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Learn Sprout <family@updates.learn-sprout.com>',
      to: recipientEmail,
      subject: `You've been invited to join ${familyName} on Learn Sprout`,
      replyTo: 'support@updates.learn-sprout.com',
      headers: {
        'X-Entity-Ref-ID': new Date().getTime().toString(),
      },
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://learnsprout.vercel.app/icons/icon-192x192.png" alt="Learn Sprout Logo" style="height: 40px; margin-bottom: 20px;">
            <h1 style="color: #059669; margin: 0; font-size: 24px;">Join ${familyName} on Learn Sprout</h1>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
            <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">Hi there,</p>
            <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">
              <strong>${inviterName}</strong> has invited you to join their family on Learn Sprout. 
              This will give you access to view and manage your family's learning activities and progress.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              <strong>What is Learn Sprout?</strong><br>
              Learn Sprout is a platform that helps families track and manage their children's learning activities and progress.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              <strong>What happens next?</strong><br>
              Click the button above to create your account and join the family. This invitation will expire in 7 days.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              Sent by Learn Sprout • <a href="https://learnsprout.vercel.app" style="color: #059669; text-decoration: none;">Visit Website</a>
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in sendFamilyInvitationEmail:', error);
    throw error;
  }
}

export async function sendWeeklyPlanEmail(
  recipientEmail: string,
  userName: string,
  childName: string,
  weekStartingDate: Date,
  weeklyPlanData: any,
  activitiesDetails: Record<string, any>
) {
  if (!resend) {
    throw new Error('Email service can only be used on the server side');
  }

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

  try {
    const { data, error } = await resend.emails.send({
      from: 'Learn Sprout <weekly@updates.learn-sprout.com>',
      to: recipientEmail,
      subject: `${childName}'s Weekly Plan: ${weekRangeText}`,
      replyTo: 'support@updates.learn-sprout.com',
      headers: {
        'X-Entity-Ref-ID': `weekly-plan-${childName}-${weekStartingDate.toISOString()}`,
      },
      html: `
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
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in sendWeeklyPlanEmail:', error);
    throw error;
  }
} 