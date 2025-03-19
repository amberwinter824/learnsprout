import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendFamilyInvitationEmail(
  recipientEmail: string,
  inviteUrl: string,
  familyName: string,
  inviterName: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Learn Sprout <noreply@learnsprout.com>',
      to: recipientEmail,
      subject: `You've been invited to join ${familyName} on Learn Sprout`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">Join ${familyName} on Learn Sprout</h1>
          <p>Hi there,</p>
          <p>${inviterName} has invited you to join their family on Learn Sprout. Click the button below to accept the invitation:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in sendFamilyInvitationEmail:', error);
    throw error;
  }
} 