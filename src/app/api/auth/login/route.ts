import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { preAuthSql } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ message: "Email and password required." }, { status: 400 });
  }
  const userEmail = String(email).toLowerCase().trim();

  // Pre-login there is no org context, so `users` (RLS-protected) can't be read directly;
  // auth_find_user() is the SECURITY DEFINER lookup from migration 005.
  let user: any;
  try {
    [user] = (await preAuthSql`SELECT * FROM auth_find_user(${userEmail}, true)`) as any[];
  } catch (err) {
    console.error("login lookup failed", err);
    return NextResponse.json({ message: "Sign-in is temporarily unavailable." }, { status: 503 });
  }

  // The old AUTH_EMAIL/AUTH_PASSWORD env-var fallback is gone: it had no users row, hence no
  // organization, so it cannot be given tenant claims. The admin now lives in `users`.
  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !valid) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const token = await signSession({
    sub: user.id,
    email: userEmail,
    role: user.role,
    name: user.full_name,
    organization_id: user.organization_id,
    is_platform_admin: user.is_platform_admin === true,
  });

  const res = NextResponse.json({ ok: true, role: user.role, name: user.full_name });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return res;
}
