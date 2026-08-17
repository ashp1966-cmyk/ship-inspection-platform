// Neon serverless Postgres driver — also works with Supabase's pooled
// connection string (use the "Transaction" pooler URL on port 6543).
// npm i @neondatabase/serverless
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(process.env.DATABASE_URL);

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
