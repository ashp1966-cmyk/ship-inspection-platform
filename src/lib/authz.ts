// Authorization for user management. RLS already confines a caller to their own organization
// (platform admins excepted); these checks add *who may manage users at all* and stop
// privilege escalation, and they re-check org boundaries in code so correctness doesn't hinge
// on a possibly-stale JWT claim.
import { NextResponse } from "next/server";
import { sql, getClaims } from "./db";

export const ROLES = ["admin", "inspector", "viewer"] as const;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Actor = {
  id: string;
  organization_id: string;
  role: string;
  is_platform_admin: boolean;
};

const deny = (status: 401 | 403 | 404, error: string) => NextResponse.json({ error }, { status });
export { deny };

// The caller must be signed in, still active, and an org admin (users.role = 'admin') or a
// platform admin. Role/flags come from a fresh DB read, not the JWT: demoting or deactivating
// someone takes effect on their next user-management call instead of after the 8h token expires.
export async function requireUserAdmin(): Promise<{ actor: Actor } | { error: NextResponse }> {
  const claims = await getClaims();
  if (!claims) return { error: deny(401, "Unauthorized") };
  const [u] = (await sql`
    SELECT id, role, is_active, organization_id, is_platform_admin FROM users WHERE id = ${claims.sub}
  `) as any[];
  if (!u || !u.is_active) return { error: deny(401, "Unauthorized") };
  if (u.role !== "admin" && !u.is_platform_admin) {
    return { error: deny(403, "Only an organization admin or platform admin can manage users.") };
  }
  return { actor: { id: u.id, organization_id: u.organization_id, role: u.role, is_platform_admin: u.is_platform_admin } };
}

// May `actor` act on `target` (a users row)? Same org, or platform admin. Platform-admin
// accounts are modifiable only by platform admins — otherwise an org admin in the same org
// (e.g. AUK) could reset a platform admin's password and take the account over.
export function canManage(actor: Actor, target: { organization_id: string; is_platform_admin: boolean }) {
  if (actor.is_platform_admin) return true;
  if (target.is_platform_admin) return false;
  return target.organization_id === actor.organization_id;
}

// Who may create or edit inspections, vessels, deficiencies and uploads: signed in, still active,
// and role admin or inspector. 'viewer' is read-only. Role comes from a fresh DB read (not the
// JWT) so a demotion or deactivation applies immediately, same as requireUserAdmin.
export const EDITOR_ROLES = ["admin", "inspector"];
export async function requireEditor(): Promise<{ actor: Actor } | { error: NextResponse }> {
  const claims = await getClaims();
  if (!claims) return { error: deny(401, "Unauthorized") };
  const [u] = (await sql`
    SELECT id, role, is_active, organization_id, is_platform_admin FROM users WHERE id = ${claims.sub}
  `) as any[];
  if (!u || !u.is_active) return { error: deny(401, "Unauthorized") };
  if (!EDITOR_ROLES.includes(u.role)) {
    return { error: deny(403, "Your role is read-only. Only admins and inspectors can create or edit.") };
  }
  return { actor: { id: u.id, organization_id: u.organization_id, role: u.role, is_platform_admin: u.is_platform_admin } };
}
