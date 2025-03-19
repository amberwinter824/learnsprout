import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Learn Sprout <noreply@learnsprout.com>',
      to: 'amberwinter824@gmail.com',
      subject: 'Test Email from Learn Sprout',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">Test Email</h1>
          <p>This is a test email from Learn Sprout. If you're seeing this, the email service is working correctly!</p>
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
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
} 