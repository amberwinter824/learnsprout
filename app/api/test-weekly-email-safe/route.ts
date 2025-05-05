import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';

// Global variables to store initialized services
let adminDb: any = null;
let resend: any = null;
let initializationError: string | null = null;

// Initialize Firebase Admin if not already initialized
try {
  if (!getApps().length) {
    // Check if Firebase service account key exists
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      initializationError = 'Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable';
      console.error(initializationError);
    } else {
      try {
        // Try to decode and parse the service account
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString();
        const serviceAccount = JSON.parse(decoded);
        
        // Initialize Firebase with the service account
        initializeApp({
          credential: cert(serviceAccount)
        });
      } catch (error: any) {
        initializationError = `Error initializing Firebase: ${error.message}`;
        console.error(initializationError, error);
      }
    }
  }
  
  if (getApps().length > 0) {
    adminDb = getFirestore();
  }
  
  // Initialize Resend
  if (!process.env.RESEND_API_KEY) {
    if (!initializationError) {
      initializationError = 'Missing RESEND_API_KEY environment variable';
    }
    console.error('Missing RESEND_API_KEY environment variable');
  } else {
    try {
      resend = new Resend(process.env.RESEND_API_KEY);
    } catch (error: any) {
      if (!initializationError) {
        initializationError = `Error initializing Resend: ${error.message}`;
      }
      console.error('Error initializing Resend:', error);
    }
  }
} catch (error: any) {
  initializationError = `Unexpected initialization error: ${error.message}`;
  console.error(initializationError, error);
}

export async function GET(request: NextRequest) {
  // Return detailed initialization status
  if (initializationError || !adminDb || !resend) {
    return NextResponse.json({ 
      error: 'Services not properly initialized',
      details: {
        message: initializationError || 'Unknown initialization error',
        firebaseInitialized: !!adminDb,
        resendInitialized: !!resend,
        environment: process.env.NODE_ENV,
        hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
        hasResendKey: !!process.env.RESEND_API_KEY
      }
    }, { status: 500 });
  }
  
  // Get query params
  const searchParams = request.nextUrl.searchParams;
  const userEmail = searchParams.get('email');
  
  // Validate required parameters
  if (!userEmail) {
    return NextResponse.json({ error: 'Missing required parameter: email' }, { status: 400 });
  }
  
  try {
    // Generate a dummy weekly plan email for testing
    const emailHtml = generateDummyWeeklyPlanEmail('Parent', 'Child');
    
    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'Learn Sprout <weekly@updates.learn-sprout.com>',
      to: userEmail,
      subject: `Test Weekly Plan - Safe Mode`,
      html: emailHtml
    });
    
    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent in safe mode (dummy data, no Firebase queries)',
      data,
      results: [
        {
          childName: 'Test Child',
          success: true,
          emailId: data?.id
        }
      ]
    });
    
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}

function generateDummyWeeklyPlanEmail(userName: string, childName: string): string {
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
  
  const weekEnd = new Date(nextMonday);
  weekEnd.setDate(weekEnd.getDate() + 4); // Monday to Friday
  
  const dateOptions: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  const weekRangeText = `${nextMonday.toLocaleDateString('en-US', dateOptions)} - ${weekEnd.toLocaleDateString('en-US', dateOptions)}`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #059669; margin: 0; font-size: 24px;">Test Weekly Plan (Safe Mode)</h1>
        <p style="color: #4b5563; margin: 10px 0 0 0;">Week of ${weekRangeText}</p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">Hi ${userName},</p>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">
          This is a test weekly plan email sent in safe mode. No Firebase database interactions were used
          to generate this email. This mode is useful for testing email sending functionality when there
          might be Firebase configuration issues.
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
        <a href="https://learnsprout.vercel.app/dashboard" 
           style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
          Go to Dashboard
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