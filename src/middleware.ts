import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Better Auth session cookie names (varies by HTTP vs HTTPS environments)
  const sessionCookie = 
    request.cookies.get('better-auth.session_token') || 
    request.cookies.get('__secure-better-auth.session_token');

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!sessionCookie) {
      // Not logged in -> Redirect to sign-in page
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    try {
      // Call the Better Auth get-session endpoint from the middleware
      const response = await fetch(new URL('/api/auth/get-session', request.url), {
        headers: {
          cookie: `${sessionCookie.name}=${sessionCookie.value}`,
        },
      });

      if (!response.ok) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      const data = await response.json();

      // Check if session user has admin role
      if (!data || !data.user || data.user.role !== 'admin') {
        // Logged in but not admin -> Redirect to home page
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      console.error('Middleware check failed:', error);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
