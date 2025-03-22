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