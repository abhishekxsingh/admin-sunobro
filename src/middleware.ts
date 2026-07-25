import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = process.env.ADMIN_SESSION_COOKIE ?? "sb_admin_session";
const IS_DEV = process.env.NODE_ENV === "development";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth on local dev only — not on staging/preview deployments that may
  // also run with NODE_ENV=development.
  const host = request.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (IS_DEV && isLocalhost) return NextResponse.next();

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
