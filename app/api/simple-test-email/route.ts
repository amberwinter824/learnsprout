import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Only initialize Resend on the server side
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  // Get query params
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email') || 'amberwinter824@gmail.com';
  
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Missing RESEND_API_KEY environment variable' }, { status: 500 });
    }
    
    // Generate a simple weekly plan HTML for testing
    const emailHtml = generateSimpleWeeklyPlanEmailHtml();
    
    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'Learn Sprout <weekly@updates.learn-sprout.com>',
      to: email,
      subject: `Simple Test Weekly Plan`,
      html: emailHtml
    });
    
    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Simple test email sent',
      data
    });
    
  } catch (error: any) {
    console.error('Error sending simple test email:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

function generateSimpleWeeklyPlanEmailHtml(): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #059669; margin: 0; font-size: 24px;">Weekly Plan Test Email</h1>
        <p style="color: #4b5563; margin: 10px 0 0 0;">This is a simple test email</p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">Hi Parent,</p>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">
          This is a simple test email to verify that your email service is working correctly. No Firebase database 
          connection is required for this test.
        </p>
      </div>
      
      <div style="margin: 30px 0;">
        <div style="margin-bottom: 25px;">
          <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
            Monday
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

        <div style="margin-bottom: 25px;">
          <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
            Tuesday
          </h3>
          <div style="background-color: #f9fafb; border-left: 3px solid #059669; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-weight: 500; color: #111827;">Pouring Practice</span>
              <span style="color: #6b7280; font-size: 14px;">Afternoon</span>
            </div>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">Practice pouring between containers using water or dry materials.</p>
            <div style="margin-top: 8px;">
              <span style="background-color: #d1fae5; color: #065f46; font-size: 12px; padding: 3px 8px; border-radius: 12px;">Practical Life</span>
              <span style="background-color: #e0f2fe; color: #0369a1; font-size: 12px; padding: 3px 8px; border-radius: 12px; margin-left: 5px;">beginner</span>
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://learnsprout.vercel.app" 
           style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
          View Full Plan
        </a>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px;">
          Sent by Learn Sprout • <a href="https://learnsprout.vercel.app" style="color: #059669; text-decoration: none;">Visit Website</a>
        </p>
      </div>
    </div>
  `;
} 