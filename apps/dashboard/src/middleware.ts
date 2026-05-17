import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'leadpilot.bootdigital.com.br';
const PUBLIC_PATHS = ['/login', '/signup', '/auth'];

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  if (host !== CANONICAL_HOST && host !== 'localhost:3000' && !host.startsWith('localhost')) {
    const url = request.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.protocol = 'https';
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isPublicPath) {
    const hasAuthCookie = request.cookies.getAll().some(
      (c) => c.name.includes('auth-token') || c.name.includes('sb-'),
    );
    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
