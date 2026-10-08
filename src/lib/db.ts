// Tenant-scoped Postgres access — the single choke point for multi-tenancy.
//
// Every query runs as `ship_app` (NOBYPASSRLS; DATABASE_URL_APP) inside a transaction whose
// first statement sets the two transaction-local settings the RLS policies read:
//     app.org_id, app.is_platform_admin
// taken from the *verified* ship_session JWT. Routes just keep writing sql`...`; they cannot
// forget the context. No valid session => empty context => RLS returns zero rows (fail closed).
//
// The owner connection (DATABASE_URL, neondb_owner, BYPASSRLS) is for migrations/scripts only
// and is deliberately not used here.
//
// The Neon HTTP driver is stateless (each call is its own transaction), so a SET LOCAL on one
// call would not reach the next. Instead each logical query is sent as
//     sql.transaction([ set_config(...), <your query> ])
// in a single HTTP round trip, and the set_config result is stripped from what callers see.
import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Claims } from "./session";

const url = process.env.DATABASE_URL_APP;
if (!url) {
  throw new Error(
    "DATABASE_URL_APP is not set. The app must connect as the RLS-enforced `ship_app` role; " +
      "refusing to fall back to the owner connection (it bypasses row level security)."
  );
}
const raw = neon(url);

const SET_CONTEXT =
  "SELECT set_config('app.org_id', $1, true), set_config('app.is_platform_admin', $2, true)";

// Verified claims for the current request, or null (no cookie, bad signature, expired, legacy
// token without tenant claims, or called outside a request scope).
export async function getClaims(): Promise<Claims | null> {
  try {
    const jar = await cookies();
    return await verifySession(jar.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

type Built = { text: string; params: any[] };

async function run(queries: Built[]): Promise<any[][]> {
  const claims = await getClaims();
  const org = claims?.organization_id ?? "";
  const admin = claims?.is_platform_admin ? "true" : "false";
  const results = await raw.transaction([
    raw.query(SET_CONTEXT, [org, admin]),
    ...queries.map((q) => raw.query(q.text, q.params)),
  ]);
  return results.slice(1) as any[][]; // drop the set_config result
}

// Lazy and awaitable: nothing is sent until awaited (or until it is handed to sql.transaction),
// which is what lets tagged templates be composed into a transaction.
class ScopedQuery implements PromiseLike<any> {
  private p?: Promise<any>;
  constructor(readonly text: string, readonly params: any[]) {}
  private exec() {
    return (this.p ??= run([this]).then((r) => r[0]));
  }
  then<R1 = any, R2 = never>(
    onfulfilled?: ((v: any) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((e: any) => R2 | PromiseLike<R2>) | null
  ) {
    return this.exec().then(onfulfilled, onrejected);
  }
  catch<R = never>(onrejected?: ((e: any) => R | PromiseLike<R>) | null) {
    return this.exec().catch(onrejected);
  }
  finally(f?: (() => void) | null) {
    return this.exec().finally(f);
  }
}

function tag(strings: TemplateStringsArray, ...values: any[]): ScopedQuery {
  const text = strings.reduce((t, s, i) => t + s + (i < values.length ? `$${i + 1}` : ""), "");
  return new ScopedQuery(text, values);
}
function query(text: string, params: any[] = []): ScopedQuery {
  return new ScopedQuery(text, params);
}
// Same shape as the Neon driver: an array of queries, or a callback receiving a tag fn.
async function transaction(
  queriesOrFn: ScopedQuery[] | ((txn: typeof tag & { query: typeof query }) => ScopedQuery[])
): Promise<any[][]> {
  const qs = typeof queriesOrFn === "function" ? queriesOrFn(Object.assign(tag, { query })) : queriesOrFn;
  if (!qs.every((q) => q instanceof ScopedQuery)) {
    throw new Error("sql.transaction() only accepts queries created by this module's sql tag/query()");
  }
  return run(qs);
}

export const sql = Object.assign(tag, { query, transaction });

// UNSCOPED access (no org context), for pre-login flows only. Because it never sets
// app.org_id, RLS returns nothing from tenant tables — it can only reach tables without RLS
// (password_reset_tokens) and the SECURITY DEFINER auth_* functions from migration 005.
export const preAuthSql = raw;

// The Neon driver parses Postgres DATE columns into JS `Date` objects built
// from local calendar components (year/month/day at local midnight), not
// UTC. Passed straight through NextResponse.json()/JSON.stringify(), that
// Date serializes via toISOString() into a full UTC timestamp — which
// shifts to the previous day whenever the server's TZ is ahead of UTC, and
// is invalid as an <input type="date"> value either way (it expects a bare
// "YYYY-MM-DD", not a timestamp). Extract the calendar date with local
// getters (matching how the driver built the Date) to get back the exact
// stored date as a plain string.
export function dateStr(v: unknown): string | null {
  if (v == null) return null;
  if (!(v instanceof Date)) return v as string;
  const y = v.getFullYear();
  const m = String(v.getMonth() + 1).padStart(2, "0");
  const d = String(v.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
