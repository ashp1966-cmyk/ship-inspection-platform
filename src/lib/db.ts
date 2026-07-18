// Neon serverless Postgres driver — also works with Supabase's pooled
// connection string (use the "Transaction" pooler URL on port 6543).
// npm i @neondatabase/serverless
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(process.env.DATABASE_URL);
