import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "change-this-secret-in-production"
);

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ message: "Email and password required." }, { status: 400 });
  }

  let userEmail = email.toLowerCase().trim();
  let role = "inspector";
  let name = "";

  // 1. Check DB users first
  try {
    const users = await sql`
      SELECT * FROM users WHERE email = ${userEmail} AND is_active = true
    ` as any[];

    if (users.length > 0) {
      const user = users[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
      role = user.role;
      name = user.full_name;
    } else {
      // 2. Fall back to env-var admin credentials
      const envEmail = process.env.AUTH_EMAIL ?? "";
      const envPass  = process.env.AUTH_PASSWORD ?? "";
      if (userEmail !== envEmail.toLowerCase() || password !== envPass) {
        return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
      }
      role = "admin";
      name = "Administrator";
    }
  } catch {
    // DB may not have users table yet — fall back to env vars
    const envEmail = process.env.AUTH_EMAIL ?? "";
    const envPass  = process.env.AUTH_PASSWORD ?? "";
    if (userEmail !== envEmail.toLowerCase() || password !== envPass) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }
    role = "admin"; name = "Administrator";
  }

  const token = await new SignJWT({ email: userEmail, role, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);

  const res = NextResponse.json({ ok: true, role, name });
  res.cookies.set("ship_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}
