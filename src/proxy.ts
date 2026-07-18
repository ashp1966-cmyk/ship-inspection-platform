import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "change-this-secret-in-production"
);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const res = NextResponse.next();
  // Pass pathname to layout so it can hide header on /login
  res.headers.set("x-pathname", pathname);

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/auk-logo")
  ) {
    return res;
  }

  const token = req.cookies.get("ship_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return res;
  } catch {
    const redirect = NextResponse.redirect(new URL("/login", req.url));
    redirect.cookies.set("ship_session", "", { maxAge: 0, path: "/" });
    return redirect;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
