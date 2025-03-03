import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get token from cookies - this is the correct way to check auth in middleware
  const token = request.cookies.get('token')?.value;
  
  // Define public and protected paths
  const isPublicPath = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/signup') || 
    request.nextUrl.pathname.startsWith('/reset-password');
  
  const isProtectedPath = 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/children') ||
    request.nextUrl.pathname.startsWith('/activities');
  
  // If trying to access protected route without token
  if (isProtectedPath && !token) {
    console.log(`Middleware: Redirecting from ${request.nextUrl.pathname} to /login (no token)`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If trying to access auth pages with token
  if (isPublicPath && token) {
    console.log(`Middleware: Redirecting from ${request.nextUrl.pathname} to /dashboard (already authenticated)`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/children/:path*', 
    '/activities/:path*', 
    '/login', 
    '/signup', 
    '/reset-password'
  ],
};