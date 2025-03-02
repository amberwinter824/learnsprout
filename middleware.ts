import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Define public paths
  const isPublicPath = 
    path === '/login' || 
    path === '/signup' || 
    path === '/reset-password';
  
  // Get the token from cookies
  const token = request.cookies.get('token')?.value || '';

  // If trying to access a public path while logged in, redirect to dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If trying to access a protected path without a token, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/reset-password',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}