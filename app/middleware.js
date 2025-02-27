import { NextResponse } from 'next/server';
import { auth } from './lib/firebase';
// This function can be marked `async` if using `await` inside
export function middleware(request) {
    // Check if the user is authenticated
    const user = auth.currentUser;
    
    // If they're trying to access a protected route without being logged in
    if (!user && !request.nextUrl.pathname.startsWith('/login') && 
        !request.nextUrl.pathname.startsWith('/signup') && 
        !request.nextUrl.pathname.startsWith('/reset-password')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // If they're logged in and trying to access auth pages
    if (user && (request.nextUrl.pathname.startsWith('/login') || 
                 request.nextUrl.pathname.startsWith('/signup') || 
                 request.nextUrl.pathname.startsWith('/reset-password'))) {
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