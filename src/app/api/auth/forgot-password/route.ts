import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { preAuthSql } from "@/lib/db";

const GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }
  const userEmail = String(email).toLowerCase().trim();

  const users = await preAuthSql`SELECT id FROM auth_find_user(${userEmail}, true)` as any[];

  // Always return the same message whether or not the account exists, so
  // this endpoint can't be used to enumerate registered emails.
  if (users.length === 0) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const userId = users[0].id;
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await preAuthSql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `;

  const resendKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (resendKey && appUrl) {
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Ship Inspection Platform <noreply@aukmarime.com>",
        to: [userEmail],
        subject: "Reset your password — Ship Inspection Platform",
        html: `<h2 style="color:#0A1628">Password Reset Request</h2>
          <p>Click the link below to set a new password. This link expires in 1 hour and can only be used once.</p>
          <p><a href="${resetUrl}" style="background:#0A1628;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">Reset Password →</a></p>
          <p style="color:#6B7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`,
      }),
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
