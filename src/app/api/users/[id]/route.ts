import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireUserAdmin, canManage, deny, ROLES } from "@/lib/authz";
import bcrypt from "bcryptjs";

async function loadTarget(id: string) {
  // RLS hides other orgs' users from an org admin (=> 404); canManage re-checks in code.
  const [t] = (await sql`
    SELECT id, role, is_active, organization_id, is_platform_admin FROM users WHERE id = ${id}
  `) as any[];
  return t;
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireUserAdmin();
  if ("error" in auth) return auth.error;
  const { actor } = auth;
  const { id } = await props.params;

  const b = await req.json();
  const { full_name, role, is_active, password } = b;

  // Nobody changes organization or platform-admin status through the API (moving a user
  // between orgs, or granting platform admin, is a deliberate operator action, not an endpoint).
  if ("organization_id" in b || "is_platform_admin" in b) {
    return deny(403, "organization_id and is_platform_admin cannot be changed through the API.");
  }

  const target = await loadTarget(id);
  if (!target || !canManage(actor, target)) return deny(404, "User not found.");

  if (!ROLES.includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  if (typeof is_active !== "boolean" || !full_name) {
    return NextResponse.json({ error: "full_name and is_active are required." }, { status: 400 });
  }
  if (target.id === actor.id) {
    if (role !== target.role) return deny(403, "You cannot change your own role.");
    if (is_active === false) return deny(403, "You cannot deactivate your own account.");
  }
  if (password !== undefined && password !== "" && (typeof password !== "string" || password.length < 8)) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const hash = password ? await bcrypt.hash(password, 12) : null;
  const [user] = (await sql`
    UPDATE users SET full_name = ${full_name}, role = ${role}, is_active = ${is_active},
      password_hash = COALESCE(${hash}, password_hash), updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, email, full_name, role, is_active, created_at, organization_id
  `) as any[];
  return NextResponse.json(user);
}

export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireUserAdmin();
  if ("error" in auth) return auth.error;
  const { actor } = auth;
  const { id } = await props.params;

  const target = await loadTarget(id);
  if (!target || !canManage(actor, target)) return deny(404, "User not found.");
  if (target.id === actor.id) return deny(403, "You cannot delete your own account.");

  await sql`DELETE FROM users WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
