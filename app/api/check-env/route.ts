import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check for Firebase Service Account
    const hasFBServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const fbKeyLength = hasFBServiceAccount ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY!.length : 0;
    
    // Check for traditional Firebase admin credentials
    const hasTraditionalCredentials = !!(
      process.env.FIREBASE_ADMIN_PRIVATE_KEY && 
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    );
    
    // Check for Resend API key
    const hasResendKey = !!process.env.RESEND_API_KEY;
    const resendKeyLength = hasResendKey ? process.env.RESEND_API_KEY!.length : 0;
    
    // Get Node environment
    const nodeEnv = process.env.NODE_ENV || 'unknown';
    
    let fbKeyValidJSON = false;
    let decodedLength = 0;
    
    // Try to decode and parse the Firebase service account key if present
    if (hasFBServiceAccount) {
      try {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '', 'base64').toString();
        decodedLength = decoded.length;
        
        try {
          const json = JSON.parse(decoded);
          fbKeyValidJSON = true;
        } catch (jsonError) {
          console.error('Firebase service account key is not valid JSON after decoding');
        }
      } catch (error) {
        console.error('Firebase service account key could not be decoded from base64');
      }
    }
    
    // Get all environment variable keys (without values)
    const envKeys = Object.keys(process.env).filter(key => 
      key.includes('FIREBASE') || 
      key.includes('NEXT_') || 
      key.includes('RESEND')
    );
    
    // Return the environment variable status
    return NextResponse.json({
      environment: nodeEnv,
      firebase: {
        serviceAccountPresent: hasFBServiceAccount,
        serviceAccountLength: fbKeyLength,
        decodedLength,
        serviceAccountValid: fbKeyValidJSON,
        traditionalCredentialsPresent: hasTraditionalCredentials
      },
      resend: {
        apiKeyPresent: hasResendKey,
        apiKeyLength: resendKeyLength
      },
      availableEnvKeys: envKeys
    });
  } catch (error) {
    console.error('Error in check-env route:', error);
    return NextResponse.json({
      error: 'Failed to check environment variables',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : '') : undefined
    }, { status: 500 });
  }
} 