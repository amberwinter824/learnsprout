import { NextResponse } from 'next/server';
import { sendFamilyInvitationEmail } from '@/lib/emailService';

export async function POST(request: Request) {
  try {
    const { recipientEmail, inviteUrl, familyName, inviterName } = await request.json();

    if (!recipientEmail || !inviteUrl || !familyName || !inviterName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await sendFamilyInvitationEmail(
      recipientEmail,
      inviteUrl,
      familyName,
      inviterName
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending invitation email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send invitation email' },
      { status: 500 }
    );
  }
} 