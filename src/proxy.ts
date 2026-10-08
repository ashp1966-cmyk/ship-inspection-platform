import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const res = NextResponse.next();
  // Pass pathname to layout so it can hide header on /login
  res.headers.set("x-pathname", pathname);

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/auk-logo")
  ) {
    return res;
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Signature + expiry + tenant claims. Legacy sessions (no organization_id) fail here and
  // are sent back to /login to get a token that carries the claims RLS needs.
  if (await verifySession(token)) return res;
  const redirect = NextResponse.redirect(new URL("/login", req.url));
  redirect.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
