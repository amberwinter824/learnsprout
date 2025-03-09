// middleware.ts - Simplified version
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Get the path being requested
  const path = request.nextUrl.pathname;
  console.log(`Middleware processing path: ${path}`);
  
  // Define public paths that don't require authentication
  const isPublicPath = 
    path === '/login' || 
    path === '/signup' || 
    path === '/reset-password' ||
    path === '/';
  
  // Define protected paths
  const isProtectedPath = 
    path.startsWith('/dashboard') || 
    path.startsWith('/children') || 
    path.startsWith('/activities') ||
    path.startsWith('/educator') || 
    path.startsWith('/classroom') ||
    path.startsWith('/admin');
  
  // Get the token from cookies
  const token = request.cookies.get('token')?.value;
  
  // For protected paths: if no token, redirect to login
  if (isProtectedPath && !token) {
    console.log(`Middleware: No token for protected path ${path}, redirecting to login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // For public paths: if token exists, redirect to dashboard
  if (isPublicPath && token) {
    console.log(`Middleware: Token exists for public path ${path}, redirecting to dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Allow all other paths
  console.log(`Middleware: Allowing access to ${path}`);
  return NextResponse.next();
}

// Configure which paths should be processed by this middleware
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