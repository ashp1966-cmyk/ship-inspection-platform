import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireUserAdmin, deny, ROLES, UUID_RE } from "@/lib/authz";
import bcrypt from "bcryptjs";

// Listing is scoped by RLS: an org sees its own users, a platform admin sees every org's.
export async function GET() {
  const rows = await sql`
    SELECT id, email, full_name, role, is_active, created_at, organization_id
    FROM users ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireUserAdmin();
  if ("error" in auth) return auth.error;
  const { actor } = auth;

  const b = await req.json();
  const { email, password, full_name, role, organization_id } = b;

  // Never settable through the API, by anyone.
  if ("is_platform_admin" in b) return deny(403, "is_platform_admin cannot be set through the API.");

  // Org admins create users in their own org only. A platform admin may name another org.
  let orgId = actor.organization_id;
  if (organization_id !== undefined && organization_id !== null && organization_id !== "") {
    if (organization_id !== actor.organization_id && !actor.is_platform_admin) {
      return deny(403, "You can only create users in your own organization.");
    }
    if (typeof organization_id !== "string" || !UUID_RE.test(organization_id)) {
      return NextResponse.json({ error: "Invalid organization_id." }, { status: 400 });
    }
    const org = (await sql`SELECT id FROM organizations WHERE id = ${organization_id}`) as any[];
    if (org.length === 0) return NextResponse.json({ error: "Organization not found." }, { status: 400 });
    orgId = organization_id;
  }

  const newRole = role ?? "inspector";
  if (!ROLES.includes(newRole)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  if (!email || !full_name || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Email, full name and a password of at least 8 characters are required." }, { status: 400 });
  }

  try {
    const password_hash = await bcrypt.hash(password, 12);
    const [user] = (await sql`
      INSERT INTO users (email, password_hash, full_name, role, organization_id)
      VALUES (${String(email).toLowerCase().trim()}, ${password_hash}, ${full_name}, ${newRole}, ${orgId})
      RETURNING id, email, full_name, role, is_active, created_at, organization_id
    `) as any[];
    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Could not create user." }, { status: 500 });
  }
}
