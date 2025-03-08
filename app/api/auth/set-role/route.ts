// app/api/auth/set-role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  try {
    // Path to your service account JSON file
    const serviceAccountPath = path.join(process.cwd(), 'config/service-account.json');
    
    // Read and parse the service account file
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, 'utf8')
    );

    // Initialize the app with the service account
    initializeApp({
      credential: cert(serviceAccount)
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    // Fallback to environment variables if file reading fails
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only allow server-to-server or admin requests
    // In production, you should implement proper authentication here
    // such as checking for an admin token or API key
    
    const { userId, role, adminKey } = await request.json();
    
    // Simple security check - in a real app use a secure admin key or authentication
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }
    
    // Validate role
    const validRoles = ['parent', 'educator', 'admin', 'specialist'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    // Set custom claims for the user
    await auth().setCustomUserClaims(userId, { role });
    
    // Return success
    return NextResponse.json({ 
      success: true, 
      message: `Role ${role} set for user ${userId}` 
    });
  } catch (error: any) {
    console.error('Error setting user role:', error);
    return NextResponse.json({ 
      error: 'Failed to set user role', 
      message: error.message 
    }, { status: 500 });
  }
}