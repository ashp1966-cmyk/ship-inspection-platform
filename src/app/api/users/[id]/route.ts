import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { full_name, role, is_active, password } = await req.json();
  if (password) {
    const hash = await bcrypt.hash(password, 12);
    await sql`UPDATE users SET full_name=${full_name}, role=${role},
      is_active=${is_active}, password_hash=${hash}, updated_at=NOW()
      WHERE id=${id}`;
  } else {
    await sql`UPDATE users SET full_name=${full_name}, role=${role},
      is_active=${is_active}, updated_at=NOW() WHERE id=${id}`;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await sql`DELETE FROM users WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
