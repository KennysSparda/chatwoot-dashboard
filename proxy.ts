import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/login'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.cookies.get('dashboard_session')?.value;
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected || session !== expected) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // roda em tudo, exceto assets estáticos do Next
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
