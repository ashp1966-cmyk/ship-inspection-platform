// RLS verification for multi-tenancy (migration 005). Run: node scripts/rls-test.mjs
//
// Part A runs in ONE connection / ONE transaction that always ends in ROLLBACK, so the live
// DB is unchanged even if an assertion throws. Setup runs as the owner (DATABASE_URL); then
// `SET LOCAL ROLE ship_app` drops to the RLS-enforced role for the assertions.
// Part B connects as the real app role (DATABASE_URL_APP) in a READ ONLY transaction.
// Exits non-zero if any assertion fails.
import { Client, neonConfig } from "@neondatabase/serverless";
import fs from "node:fs";

if (typeof WebSocket !== "undefined") neonConfig.webSocketConstructor = WebSocket;

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    })
);
for (const k of ["DATABASE_URL", "DATABASE_URL_APP"]) {
  if (!env[k]) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(2);
  }
}

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

// Hard guard: this script must never COMMIT.
const guard = (client) => ({
  query: (text, params) => {
    if (/^\s*(commit|end)\b/i.test(text)) throw new Error("refusing to COMMIT");
    return client.query(text, params);
  },
});

async function partA() {
  const raw = new Client(env.DATABASE_URL);
  await raw.connect();
  const c = guard(raw);
  const ctx = (org, admin) =>
    c.query(
      "select set_config('app.org_id', $1, true), set_config('app.is_platform_admin', $2, true)",
      [org, admin]
    );
  // Run a statement expected to error; the savepoint keeps the transaction usable afterwards.
  const expectError = async (sql, params) => {
    await c.query("SAVEPOINT s");
    try {
      await c.query(sql, params);
      await c.query("RELEASE SAVEPOINT s");
      return null;
    } catch (e) {
      await c.query("ROLLBACK TO SAVEPOINT s");
      return e;
    }
  };

  try {
    await c.query("BEGIN");

    // ---- setup, as the owner ----
    const auk = (await c.query("select id from organizations where name = 'AUK'")).rows[0]?.id;
    if (!auk) throw new Error("AUK organization not found");
    const aukVessels = (
      await c.query("select count(*)::int n from vessels where organization_id = $1", [auk])
    ).rows[0].n;
    const orgB = (
      await c.query("insert into organizations(name) values ('__rls_test_org') returning id")
    ).rows[0].id;
    const vB = (
      await c.query(
        "insert into vessels(name, imo_number, vessel_type, organization_id) values ('RLS Test Vessel','0000001','BULK_CARRIER',$1) returning id",
        [orgB]
      )
    ).rows[0].id;
    await c.query(
      "insert into inspections(vessel_id, inspection_type, organization_id) values ($1,'CONDITION',$2)",
      [vB, orgB]
    );
    check("setup: AUK has at least one vessel to protect", aukVessels > 0, `${aukVessels} AUK vessel(s)`);

    // ---- drop to the RLS-enforced role ----
    await c.query("SET LOCAL ROLE ship_app");
    const who = (await c.query("select current_user u")).rows[0].u;
    check("SET LOCAL ROLE ship_app took effect", who === "ship_app", `current_user=${who}`);

    // no context at all (settings never set in this transaction)
    let r = await c.query("select count(*)::int n from vessels");
    check("no context -> 0 vessels", r.rows[0].n === 0, `got ${r.rows[0].n}`);
    r = await c.query("select count(*)::int n from inspections");
    check("no context -> 0 inspections", r.rows[0].n === 0, `got ${r.rows[0].n}`);

    // empty-string settings (what a reused pooled connection can leave behind)
    await ctx("", "");
    let e = null;
    let n = null;
    try {
      n = (await c.query("select count(*)::int n from vessels")).rows[0].n;
    } catch (err) {
      e = err;
    }
    check("empty-string settings -> 0 rows, no throw", e === null && n === 0, e ? e.message : `got ${n}`);

    // ---- as the test org (non-admin) ----
    await ctx(orgB, "false");
    r = await c.query("select organization_id from vessels");
    check(
      "test org sees only its own vessel",
      r.rows.length === 1 && r.rows[0].organization_id === orgB,
      `${r.rows.length} row(s)`
    );
    r = await c.query("select 1 from vessels where true");
    check("test org: WHERE true still excludes AUK rows", r.rows.length === 1, `${r.rows.length} row(s)`);
    r = await c.query("select 1 from vessels where organization_id = $1", [auk]);
    check("test org: explicit AUK organization_id -> 0 rows", r.rows.length === 0, `${r.rows.length} row(s)`);
    r = await c.query("select 1 from users");
    check("test org: cannot see AUK users", r.rows.length === 0, `${r.rows.length} row(s)`);
    r = await c.query("update vessels set name = 'hacked' where organization_id = $1", [auk]);
    check("test org: cross-org UPDATE hits 0 rows", r.rowCount === 0, `rowCount=${r.rowCount}`);
    r = await c.query("delete from vessels where organization_id = $1", [auk]);
    check("test org: cross-org DELETE hits 0 rows", r.rowCount === 0, `rowCount=${r.rowCount}`);
    e = await expectError(
      "insert into vessels(name, imo_number, vessel_type, organization_id) values ('x','0000002','BULK_CARRIER',$1)",
      [auk]
    );
    check(
      "test org: INSERT with foreign organization_id fails WITH CHECK",
      e !== null && /row-level security/i.test(e.message),
      e ? e.message : "insert succeeded"
    );
    e = await expectError("update vessels set organization_id = $1 where organization_id = $2", [auk, orgB]);
    check(
      "test org: cannot UPDATE its own row into another org",
      e !== null && /row-level security/i.test(e.message),
      e ? e.message : "update succeeded"
    );

    // ---- as platform admin ----
    await ctx(auk, "true");
    r = await c.query("select distinct organization_id from vessels");
    const orgs = new Set(r.rows.map((x) => x.organization_id));
    check(
      "platform admin sees vessels from AUK and the test org",
      orgs.has(auk) && orgs.has(orgB),
      `${orgs.size} org(s)`
    );
    r = await c.query("select 1 from inspections where organization_id = $1", [orgB]);
    check("platform admin sees the test org's inspection", r.rows.length === 1, `${r.rows.length} row(s)`);

    // AUK org without the admin flag must NOT see the test org
    await ctx(auk, "false");
    r = await c.query("select distinct organization_id from vessels");
    check(
      "AUK as non-admin does NOT see the test org",
      r.rows.length === 1 && r.rows[0].organization_id === auk,
      `${r.rows.length} org(s)`
    );
  } catch (err) {
    check("part A completed without unexpected error", false, err.message);
  } finally {
    try {
      await raw.query("ROLLBACK");
    } catch {}
    // After rollback, back as the owner: nothing from the test may remain.
    try {
      const left = (
        await raw.query("select count(*)::int n from organizations where name = '__rls_test_org'")
      ).rows[0].n;
      check("ROLLBACK left no test org behind", left === 0, `${left} row(s)`);
    } catch (err) {
      check("post-rollback check", false, err.message);
    }
    await raw.end();
  }
}

async function partB() {
  const raw = new Client(env.DATABASE_URL_APP);
  await raw.connect();
  try {
    await raw.query("BEGIN READ ONLY");
    const role = (
      await raw.query(
        "select current_user u, r.rolbypassrls b from pg_roles r where r.rolname = current_user"
      )
    ).rows[0];
    check("DATABASE_URL_APP role is ship_app", role.u === "ship_app", `current_user=${role.u}`);
    check("DATABASE_URL_APP role has rolbypassrls = false", role.b === false, `rolbypassrls=${role.b}`);
    for (const t of ["vessels", "inspections", "users"]) {
      const n = (await raw.query(`select count(*)::int n from ${t}`)).rows[0].n;
      check(`app role, no context: unscoped SELECT on ${t} -> 0 rows`, n === 0, `got ${n}`);
    }
  } catch (err) {
    check("part B completed without unexpected error", false, err.message);
  } finally {
    try {
      await raw.query("ROLLBACK");
    } catch {}
    await raw.end();
  }
}

await partA();
await partB();
console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
