import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.cookies.get("dashboard_session")?.value;
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected || session !== expected) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos e imagens para que não sejam bloqueados pelo login:
     * - _next/static (arquivos estáticos do Next)
     * - _next/image (otimização de imagens)
     * - favicon.ico, revendamais_logo.png, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg).*)",
  ],
};
