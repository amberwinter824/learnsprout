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

export async function middleware(request: NextRequest) {
  // Get the path being requested
  const path = request.nextUrl.pathname;
  console.log(`Middleware processing path: ${path}`);
  
  // Define public and protected paths
  const isPublicPath = 
    path === '/login' || 
    path === '/signup' || 
    path === '/reset-password' ||
    path === '/';
  
  const isParentPath = path.startsWith('/dashboard') || 
                      path.startsWith('/children') || 
                      path.startsWith('/activities');
                      
  const isEducatorPath = path.startsWith('/educator') || 
                        path.startsWith('/classroom');
                        
  const isAdminPath = path.startsWith('/admin');
  
  const isProtectedPath = isParentPath || isEducatorPath || isAdminPath;
  
  // Get the token from cookies
  const token = request.cookies.get('token')?.value;
  
  // For protected paths: if no token, redirect to login
  if (isProtectedPath && !token) {
    console.log(`Middleware: No token for protected path ${path}, redirecting to login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If a token exists, verify it
  if (token) {
    // Verify the token
    const payload = await verifyFirebaseToken(token);
    
    if (!payload) {
      // Token is invalid or expired
      console.log('Middleware: Invalid or expired token, redirecting to login');
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token'); // Clear the invalid token
      return response;
    }
    
    // Debug token information
    console.log('Token payload:', {
      uid: payload.uid,
      exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
      iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'none',
      current: new Date().toISOString()
    });
    
    // For public paths with valid token: redirect to dashboard
    if (isPublicPath) {
      console.log(`Middleware: Valid token for public path ${path}, redirecting to dashboard`);
      
      // Get user role from custom claims
      const role = payload.role || 'parent';
      
      // Redirect to the appropriate dashboard based on user role
      if (role === 'educator') {
        return NextResponse.redirect(new URL('/educator/dashboard', request.url));
      } else if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    
    // Role-based access control
    const role = payload.role || 'parent';
    
    // Check if user has permission to access role-specific paths
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
  
  // Allow all other paths
  console.log(`Middleware: Allowing access to ${path}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
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