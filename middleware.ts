// middleware.ts - Edge-compatible middleware for role-based access
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

// Define the URL for Google's public keys used by Firebase Auth
const JWKS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Create a JWKS (JSON Web Key Set) client
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

// Verify the Firebase ID token
async function verifyFirebaseToken(token: string) {
  try {
    // Verify the token using the Firebase public keys
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// For development/testing, you may want to decode without verification
// WARNING: This is NOT secure for production
function decodeTokenWithoutVerification(token: string) {
  try {
    // Split the token and decode the payload
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    return payload;
  } catch (error) {
    console.error('Token decode failed:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // Get the path being requested
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const isPublicPath = 
    path === '/login' || 
    path === '/signup' || 
    path === '/reset-password';
  
  // Define role-specific paths
  const isParentPath = path.startsWith('/dashboard') || 
                      path.startsWith('/children') || 
                      path.startsWith('/activities');
                      
  const isEducatorPath = path.startsWith('/educator') || 
                        path.startsWith('/classroom');
                        
  const isAdminPath = path.startsWith('/admin');
  
  // Get the token from cookies
  const token = request.cookies.get('token')?.value || '';
  
  // If no token is present and trying to access a protected path
  if (!token && (isParentPath || isEducatorPath || isAdminPath)) {
    console.log(`Middleware: Redirecting to login - no token for protected path ${path}`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (token) {
    // Verify the token and get the user claims
    // For production, use verifyFirebaseToken
    // For development, you might use decodeTokenWithoutVerification
    
    // Use this for production:
    const payload = await verifyFirebaseToken(token);
    
    // Use this for development/testing only:
    // const payload = decodeTokenWithoutVerification(token);
    
    if (!payload) {
      // Token verification failed
      console.log('Middleware: Token verification failed, redirecting to login');
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }
    
    // Get user role from custom claims or Firestore data
    // Since Firebase ID tokens may not have role information by default,
    // you might need to add this as a custom claim or fetch from Firestore
    const role = payload.role || 'parent';
    
    // If token is present but trying to access a public path
    if (isPublicPath) {
      console.log(`Middleware: User with role ${role} trying to access public path, redirecting to appropriate dashboard`);
      
      // Redirect to the appropriate dashboard based on user role
      if (role === 'educator') {
        return NextResponse.redirect(new URL('/educator/dashboard', request.url));
      } else if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    
    // Check if user has permission to access the requested path
    if ((isEducatorPath && role !== 'educator' && role !== 'admin') ||
        (isAdminPath && role !== 'admin')) {
      console.log(`Middleware: User with role ${role} doesn't have permission for ${path}`);
      
      // Redirect to their appropriate dashboard
      if (role === 'educator') {
        return NextResponse.redirect(new URL('/educator/dashboard', request.url));
      } else if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }
  
  return NextResponse.next();
}

// Configure which paths should be processed by this middleware
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/children/:path*',
    '/activities/:path*',
    '/educator/:path*',
    '/classroom/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/reset-password',
  ],
};