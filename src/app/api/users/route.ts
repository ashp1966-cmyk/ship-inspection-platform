import { NextResponse } from "next/server";
import { sql, getClaims } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const rows = await sql`
    SELECT id, email, full_name, role, is_active, created_at
    FROM users ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { email, password, full_name, role, organization_id } = await req.json();
  // New users always get an explicit organization: the caller's own, unless the caller is a
  // platform admin naming another one. is_platform_admin is never settable through the API.
  const orgId = claims.is_platform_admin && organization_id ? organization_id : claims.organization_id;
  const password_hash = await bcrypt.hash(password, 12);
  const [user] = await sql`
    INSERT INTO users (email, password_hash, full_name, role, organization_id)
    VALUES (${String(email).toLowerCase().trim()}, ${password_hash}, ${full_name}, ${role ?? "inspector"}, ${orgId})
    RETURNING id, email, full_name, role, is_active, created_at, organization_id
  ` as any[];
  return NextResponse.json(user, { status: 201 });
}
