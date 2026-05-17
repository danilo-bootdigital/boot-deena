import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'leadpilot.bootdigital.com.br';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  if (host !== CANONICAL_HOST && host !== 'localhost:3000' && !host.startsWith('localhost')) {
    const url = request.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.protocol = 'https';
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
