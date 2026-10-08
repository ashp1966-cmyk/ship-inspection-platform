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

  // Pages redirect to /login; API calls get a real 401 JSON (a redirect to an HTML login page
  // is useless to fetch() callers and hid that the route was never reached).
  const isApi = pathname.startsWith("/api/");
  const unauthenticated = () =>
    isApi
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return unauthenticated();

  // Signature + expiry + tenant claims. Legacy sessions (no organization_id) fail here and
  // are sent back to /login to get a token that carries the claims RLS needs.
  if (await verifySession(token)) return res;
  const denied = unauthenticated();
  denied.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return denied;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
