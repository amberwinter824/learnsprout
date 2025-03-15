// middleware.ts - Updated version
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
  
  // Define protected paths - add family paths to protected paths
  const isProtectedPath = 
    path.startsWith('/dashboard') || 
    path.startsWith('/children') || 
    path.startsWith('/activities') ||
    path.startsWith('/view') ||
    path.startsWith('/family');  // Add family paths
  
  // Define role-specific paths
  const isAdminPath = path.startsWith('/admin');
  const isEducatorPath = path.startsWith('/educator');
  const isSpecialistPath = path.startsWith('/specialist');
  
  // Get the token from cookies
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;
  
  // For protected paths: if no token, redirect to login
  if (isProtectedPath && !token) {
    console.log(`Middleware: No token for protected path ${path}, redirecting to login`);
    
    // Store the original URL to redirect back after login
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  
  // For role-specific paths: check both token and role
  // Only apply if we actually have a token (to prevent loops)
  if (token) {
    if (isAdminPath && role !== 'admin') {
      console.log(`Middleware: Non-admin trying to access admin path ${path}`);
      // Redirect to appropriate dashboard instead of login
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    if (isEducatorPath && role !== 'educator' && role !== 'admin') {
      console.log(`Middleware: Non-educator trying to access educator path ${path}`);
      // Redirect to appropriate dashboard instead of login
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    if (isSpecialistPath && role !== 'specialist' && role !== 'admin') {
      console.log(`Middleware: Non-specialist trying to access specialist path ${path}`);
      // Redirect to appropriate dashboard instead of login
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // For public paths: if token exists, redirect to appropriate dashboard
  if (isPublicPath && token) {
    console.log(`Middleware: Token exists for public path ${path}, redirecting based on role`);
    
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (role === 'educator') {
      return NextResponse.redirect(new URL('/educator/dashboard', request.url));
    } else if (role === 'specialist') {
      return NextResponse.redirect(new URL('/specialist/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Allow all other paths
  console.log(`Middleware: Allowing access to ${path}`);
  return NextResponse.next();
}

// Configure which paths should be processed by this middleware
export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/reset-password',
    '/dashboard/:path*',
    '/children/:path*',
    '/activities/:path*',
    '/admin/:path*',
    '/educator/:path*',
    '/specialist/:path*',
    '/view/:path*',
    '/family/:path*'  // Add family paths to the matcher
  ],
};