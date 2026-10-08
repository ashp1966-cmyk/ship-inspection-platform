// Shared by login (sign), proxy.ts (verify, edge runtime) and db.ts (verify, per query).
// Must stay free of next/headers and other Node/Next-only imports so the proxy can use it.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ship_session";
export const SESSION_MAX_AGE = 60 * 60 * 8;

export type Claims = {
  sub: string; // users.id
  email: string;
  role: string;
  name: string;
  organization_id: string; // uuid; drives RLS (app.org_id)
  is_platform_admin: boolean; // drives RLS (app.is_platform_admin)
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// No hardcoded fallback: these claims now authorize data access, so a missing secret must
// fail closed (verify -> null, sign -> throw) rather than accept tokens forged with a known key.
function secret(): Uint8Array | null {
  const s = process.env.AUTH_SECRET;
  return s ? new TextEncoder().encode(s) : null;
}

export async function signSession(claims: Claims): Promise<string> {
  const key = secret();
  if (!key) throw new Error("AUTH_SECRET is not set");
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

// Verifies signature + expiry (jose), then requires well-formed tenant claims. Sessions issued
// before multi-tenancy have no organization_id and are rejected here, which forces a re-login.
export async function verifySession(token: string | undefined): Promise<Claims | null> {
  const key = secret();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const p = payload as Record<string, unknown>;
    if (
      typeof p.sub !== "string" ||
      typeof p.organization_id !== "string" ||
      !UUID_RE.test(p.organization_id) ||
      typeof p.is_platform_admin !== "boolean"
    ) {
      return null;
    }
    return {
      sub: p.sub,
      email: String(p.email ?? ""),
      role: String(p.role ?? ""),
      name: String(p.name ?? ""),
      organization_id: p.organization_id,
      is_platform_admin: p.is_platform_admin,
    };
  } catch {
    return null;
  }
}
