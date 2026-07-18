import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const rows = await sql`
    SELECT id, email, full_name, role, is_active, created_at
    FROM users ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { email, password, full_name, role } = await req.json();
  const password_hash = await bcrypt.hash(password, 12);
  const [user] = await sql`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES (${email}, ${password_hash}, ${full_name}, ${role ?? "inspector"})
    RETURNING id, email, full_name, role, is_active, created_at
  ` as any[];
  return NextResponse.json(user, { status: 201 });
}
