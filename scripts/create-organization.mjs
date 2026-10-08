// Admin-only: create a new organization and its first user.
//   node scripts/create-organization.mjs "<Org name>" <admin-email> "<Full name>" [--platform-admin]
// The password is read from the NEW_USER_PASSWORD env var (never an argv, so it stays out of
// shell history). Uses the OWNER connection (DATABASE_URL), in one transaction.
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import fs from "node:fs";

const [orgName, email, fullName, ...flags] = process.argv.slice(2);
const password = process.env.NEW_USER_PASSWORD;
if (!orgName || !email || !fullName || !password || password.length < 8) {
  console.error('usage: NEW_USER_PASSWORD=... node scripts/create-organization.mjs "<Org>" <email> "<Full name>" [--platform-admin]\n(password >= 8 chars)');
  process.exit(2);
}
const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; })
);
const sql = neon(process.env.DATABASE_URL ?? env.DATABASE_URL);
const hash = await bcrypt.hash(password, 12);
const [, user] = await sql.transaction((t) => [
  t`INSERT INTO organizations (name) VALUES (${orgName}) RETURNING id, name`,
  t`INSERT INTO users (email, password_hash, full_name, role, organization_id, is_platform_admin)
    VALUES (${email.toLowerCase().trim()}, ${hash}, ${fullName}, 'admin',
            (SELECT id FROM organizations WHERE name = ${orgName}), ${flags.includes("--platform-admin")})
    RETURNING id, email, organization_id, is_platform_admin`,
]);
console.log("created:", user[0]);
