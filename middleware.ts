import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add auth check logic here if needed
  return NextResponse.next()
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