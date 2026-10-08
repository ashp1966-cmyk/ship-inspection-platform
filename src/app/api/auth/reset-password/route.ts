import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { preAuthSql } from "@/lib/db";

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ message: "Token and new password are required." }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(String(token)).digest("hex");

  const rows = await preAuthSql`
    SELECT id, user_id FROM password_reset_tokens
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
  ` as any[];

  if (rows.length === 0) {
    return NextResponse.json({ message: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const { id: tokenId, user_id: userId } = rows[0];
  const passwordHash = await bcrypt.hash(password, 12);

  await preAuthSql`SELECT auth_set_password(${userId}, ${passwordHash})`;
  await preAuthSql`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${tokenId}`;

  return NextResponse.json({ ok: true });
}
