import { NextResponse } from "next/server";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "change-this-secret-in-production"
);

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const validEmail    = process.env.AUTH_EMAIL    ?? "";
  const validPassword = process.env.AUTH_PASSWORD ?? "";

  if (
    !email || !password ||
    email.toLowerCase().trim() !== validEmail.toLowerCase().trim() ||
    password !== validPassword
  ) {
    return NextResponse.json(
      { message: "Invalid email or password." },
      { status: 401 }
    );
  }

  // Sign a JWT that expires in 8 hours
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("ship_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });
  return res;
}
