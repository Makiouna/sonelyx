import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // better-auth uses "__Secure-" prefix (capital S, capital C) on HTTPS,
    // or no prefix on HTTP. Check all variants to be safe.
    const sessionCookie =
      request.cookies.get('better-auth.session_token') ||
      request.cookies.get('__Secure-better-auth.session_token') ||
      request.cookies.get('__Host-better-auth.session_token');

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    try {
      const response = await fetch(new URL('/api/auth/get-session', request.url), {
        headers: {
          cookie: `${sessionCookie.name}=${sessionCookie.value}`,
        },
      });

      if (!response.ok) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      const data = await response.json();

      if (!data || !data.user || data.user.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      console.error('Proxy admin check failed:', error);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
