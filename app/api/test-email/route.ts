import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// Only initialize Resend on the server side
const resend = typeof window === 'undefined' ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  if (!resend) {
    return NextResponse.json(
      { error: 'Email service can only be used on the server side' },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Learn Sprout <hello@learn-sprout.com>', // Use a custom sender name and email
      to: 'amberwinter824@gmail.com',
      subject: 'Test Email from Learn Sprout',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">Test Email</h1>
          <p>This is a test email from Learn Sprout. If you're seeing this, the email service is working correctly!</p>
          
          <!-- Sample Weekly Plan Section -->
          <div style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
            <h2 style="color: #059669; margin-top: 0;">Sample Weekly Plan</h2>
            
            <div style="margin-bottom: 15px;">
              <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                Monday, July 1
              </h3>
              <div style="background-color: #f9fafb; border-left: 3px solid #059669; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-weight: 500; color: #111827;">Color Sorting</span>
                  <span style="color: #6b7280; font-size: 14px;">Morning</span>
                </div>
                <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">Sort objects by their colors to develop visual discrimination skills.</p>
                <div style="margin-top: 8px;">
                  <span style="background-color: #d1fae5; color: #065f46; font-size: 12px; padding: 3px 8px; border-radius: 12px;">Sensorial</span>
                  <span style="background-color: #e0f2fe; color: #0369a1; font-size: 12px; padding: 3px 8px; border-radius: 12px; margin-left: 5px;">beginner</span>
                </div>
              </div>
            </div>
            
            <div style="margin-bottom: 15px;">
              <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                Tuesday, July 2
              </h3>
              <div style="background-color: #f9fafb; border-left: 3px solid #059669; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-weight: 500; color: #111827;">Pouring Practice</span>
                  <span style="color: #6b7280; font-size: 14px;">Afternoon</span>
                </div>
                <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">Practice pouring liquids between containers to develop coordination and concentration.</p>
                <div style="margin-top: 8px;">
                  <span style="background-color: #d1fae5; color: #065f46; font-size: 12px; padding: 3px 8px; border-radius: 12px;">Practical Life</span>
                  <span style="background-color: #e0f2fe; color: #0369a1; font-size: 12px; padding: 3px 8px; border-radius: 12px; margin-left: 5px;">intermediate</span>
                </div>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://learnsprout.com" 
               style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Visit Learn Sprout
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This is an automated test email. You can safely ignore it.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email. Please try again later.' },
      { status: 500 }
    );
  }
} 