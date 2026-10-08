// End-to-end multi-tenancy check (Playwright request/browser contexts against a running app).
//
//   E2E_CONFIRM=writes-to-live-db BASE_URL=http://localhost:3000 node scripts/e2e-tenancy.mjs
//
// !! This app's local dev server and production share ONE Neon database. Even against localhost this
// script writes to the live DB (a throwaway organization with a few users/vessels). Everything it
// creates hangs off that organization and is deleted in a `finally`, but it must never run by accident:
//   * E2E_CONFIRM=writes-to-live-db is REQUIRED for any run.
//   * A BASE_URL that is not localhost additionally requires E2E_ALLOW_REMOTE=1.
// Needs: DATABASE_URL (owner, for setup/cleanup), AUTH_EMAIL / AUTH_PASSWORD (the AUK platform admin)
// in .env.local. Optional PLAYWRIGHT_CHROMIUM_PATH to reuse an installed Chromium build.
import { chromium, request as pwRequest } from "playwright";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";

if (process.env.E2E_CONFIRM !== "writes-to-live-db") {
  console.error(
    "Refusing to run: this script writes (and then deletes) rows in the LIVE database.\n" +
      "Re-run with E2E_CONFIRM=writes-to-live-db if that is what you intend."
  );
  process.exit(2);
}
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const host = new URL(BASE).hostname;
if (!["localhost", "127.0.0.1"].includes(host) && process.env.E2E_ALLOW_REMOTE !== "1") {
  console.error(`Refusing to run against non-local BASE_URL (${BASE}) without E2E_ALLOW_REMOTE=1.`);
  process.exit(2);
}

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; })
);
const owner = neon(env.DATABASE_URL);
const ADMIN = { email: env.AUTH_EMAIL, password: env.AUTH_PASSWORD };
const run = crypto.randomBytes(4).toString("hex");
const PW = crypto.randomBytes(12).toString("hex");
const U = {
  admin: `e2e-admin-${run}@example.invalid`,
  inspector: `e2e-inspector-${run}@example.invalid`,
  platform: `e2e-platform-${run}@example.invalid`, // a platform admin living inside the test org
};

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

let orgB = null;
let browser = null;

async function login(creds) {
  const ctx = await browser.newContext({ baseURL: BASE });
  const r = await ctx.request.post("/api/auth/login", { data: creds });
  return { ctx, api: ctx.request, ok: r.ok(), status: r.status() };
}
const j = async (r) => { try { return await r.json(); } catch { return null; } };

try {
  browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}
  );

  // ---------- setup (owner connection) ----------
  const hash = await bcrypt.hash(PW, 12);
  [orgB] = await owner`INSERT INTO organizations (name) VALUES (${"__e2e_" + run}) RETURNING id`;
  orgB = orgB.id;
  await owner`
    INSERT INTO users (email, password_hash, full_name, role, organization_id, is_platform_admin) VALUES
      (${U.admin},     ${hash}, 'E2E Org Admin',     'admin',     ${orgB}, false),
      (${U.inspector}, ${hash}, 'E2E Inspector',     'inspector', ${orgB}, false),
      (${U.platform},  ${hash}, 'E2E Platform Admin','admin',     ${orgB}, true)`;
  const [aukUser] = await owner`SELECT id, email FROM users WHERE email = ${ADMIN.email.toLowerCase()}`;

  // ---------- AUK platform admin baseline ----------
  const pa = await login(ADMIN);
  check("AUK platform admin can log in", pa.ok, `status ${pa.status}`);
  const aukVessels = await j(await pa.api.get("/api/vessels"));
  check("AUK platform admin sees AUK's existing vessel", Array.isArray(aukVessels) && aukVessels.length >= 1, `${aukVessels?.length} vessel(s)`);
  const aukVessel = aukVessels[0];

  // ---------- org B admin: data isolation ----------
  const a = await login({ email: U.admin, password: PW });
  check("test-org admin can log in", a.ok, `status ${a.status}`);
  const aV = await j(await a.api.get("/api/vessels"));
  check("test-org admin sees 0 vessels (not AUK's)", Array.isArray(aV) && aV.length === 0, `${aV?.length}`);
  const aI = await j(await a.api.get("/api/inspections"));
  check("test-org admin sees 0 inspections", Array.isArray(aI) && aI.length === 0, JSON.stringify(aI).slice(0, 60));
  const byId = await a.api.get(`/api/vessels/${aukVessel.id}`);
  check("fetching AUK's vessel by id -> 404", byId.status() === 404, `status ${byId.status()}`);
  const page = await a.ctx.newPage();
  await page.goto("/vessels");
  await page.waitForLoadState("networkidle");
  check("/vessels page does not show AUK's vessel", !(await page.content()).includes(aukVessel.name), aukVessel.name);

  const created = await a.api.post("/api/vessels", { data: { name: "E2E Vessel", imo_number: aukVessel.imo_number, vessel_type: "BULK_CARRIER" } });
  const cv = await j(created);
  check("can register a vessel with the SAME IMO as AUK's (unique per org)", created.status() === 201, `status ${created.status()} ${cv?.error ?? ""}`);
  check("new vessel belongs to the test org", cv?.organization_id === orgB);

  const link = await a.api.post("/api/inspections", { data: { vesselId: aukVessel.id, vesselName: "x", imoNumber: aukVessel.imo_number, inspectionType: "CONDITION", answers: {} } });
  check("cannot create an inspection linked to AUK's vessel -> 400", link.status() === 400, `status ${link.status()}`);
  const upd = await a.api.put(`/api/vessels/${aukVessel.id}`, { data: { ...aukVessel, name: "HACKED" } });
  const nameNow = (await j(await pa.api.get(`/api/vessels/${aukVessel.id}`)))?.name;
  check("cannot rename AUK's vessel (404, unchanged)", upd.status() === 404 && nameNow === aukVessel.name, `status ${upd.status()}`);

  const aUsers = await j(await a.api.get("/api/users"));
  check("user list is limited to the test org (no AUK users)",
    Array.isArray(aUsers) && aUsers.length >= 1 && aUsers.every((u) => u.organization_id === orgB) && !aUsers.some((u) => u.email === ADMIN.email.toLowerCase()),
    `${aUsers?.length} user(s)`);

  // ---------- user management: roles ----------
  const ins = await login({ email: U.inspector, password: PW });
  check("test-org inspector can log in", ins.ok, `status ${ins.status}`);
  const insCreate = await ins.api.post("/api/users", { data: { email: `x-${run}@example.invalid`, password: PW, full_name: "X", role: "viewer" } });
  check("NON-ADMIN user create -> 403", insCreate.status() === 403, `status ${insCreate.status()}`);
  const myRow = (await j(await ins.api.get("/api/users"))).find((u) => u.email === U.inspector);
  const insPromote = await ins.api.put(`/api/users/${myRow.id}`, { data: { full_name: "E2E Inspector", role: "admin", is_active: true } });
  check("NON-ADMIN cannot promote themselves to admin -> 403", insPromote.status() === 403, `status ${insPromote.status()}`);
  const insDel = await ins.api.delete(`/api/users/${myRow.id}`);
  check("NON-ADMIN delete user -> 403", insDel.status() === 403, `status ${insDel.status()}`);

  // org admin: allowed, own org only
  const mk = await a.api.post("/api/users", { data: { email: `viewer-${run}@example.invalid`, password: PW, full_name: "Viewer", role: "viewer" } });
  const mkBody = await j(mk);
  check("org admin can create a user in their own org", mk.status() === 201 && mkBody?.organization_id === orgB, `status ${mk.status()}`);
  const toAuk = await a.api.post("/api/users", { data: { email: `evil-${run}@example.invalid`, password: PW, full_name: "Evil", organization_id: aukUser && aukVessel.organization_id } });
  check("CROSS-ORG: org admin creating a user in AUK -> 403", toAuk.status() === 403, `status ${toAuk.status()}`);
  const mkPlat = await a.api.post("/api/users", { data: { email: `plat-${run}@example.invalid`, password: PW, full_name: "P", is_platform_admin: true } });
  check("nobody can set is_platform_admin via create -> 403", mkPlat.status() === 403, `status ${mkPlat.status()}`);
  const badRole = await a.api.post("/api/users", { data: { email: `r-${run}@example.invalid`, password: PW, full_name: "R", role: "superuser" } });
  check("invalid role -> 400", badRole.status() === 400, `status ${badRole.status()}`);

  const putAuk = await a.api.put(`/api/users/${aukUser.id}`, { data: { full_name: "pwned", role: "viewer", is_active: false } });
  check("CROSS-ORG: org admin modifying an AUK user -> 404", putAuk.status() === 404, `status ${putAuk.status()}`);
  const delAuk = await a.api.delete(`/api/users/${aukUser.id}`);
  const stillAuk = (await owner`SELECT is_active, is_platform_admin FROM users WHERE id = ${aukUser.id}`)[0];
  check("CROSS-ORG: org admin deleting an AUK user -> 404, user intact", delAuk.status() === 404 && stillAuk?.is_active === true && stillAuk?.is_platform_admin === true, `status ${delAuk.status()}`);

  const me = (await j(await a.api.get("/api/users"))).find((u) => u.email === U.admin);
  const selfRole = await a.api.put(`/api/users/${me.id}`, { data: { full_name: "E2E Org Admin", role: "viewer", is_active: true } });
  check("cannot change your own role -> 403", selfRole.status() === 403, `status ${selfRole.status()}`);
  const selfOrg = await a.api.put(`/api/users/${me.id}`, { data: { full_name: "E2E Org Admin", role: "admin", is_active: true, organization_id: aukVessel.organization_id } });
  check("cannot change your own organization_id -> 403", selfOrg.status() === 403, `status ${selfOrg.status()}`);
  const selfPlat = await a.api.put(`/api/users/${me.id}`, { data: { full_name: "E2E Org Admin", role: "admin", is_active: true, is_platform_admin: true } });
  check("cannot grant yourself is_platform_admin -> 403", selfPlat.status() === 403, `status ${selfPlat.status()}`);
  const selfDel = await a.api.delete(`/api/users/${me.id}`);
  check("cannot delete yourself -> 403", selfDel.status() === 403, `status ${selfDel.status()}`);
  const flags = (await owner`SELECT role, organization_id, is_platform_admin FROM users WHERE id = ${me.id}`)[0];
  check("org admin's role/org/platform flag unchanged in the DB", flags.role === "admin" && flags.organization_id === orgB && flags.is_platform_admin === false);

  const plat = (await owner`SELECT id FROM users WHERE email = ${U.platform}`)[0];
  const putPlat = await a.api.put(`/api/users/${plat.id}`, { data: { full_name: "owned", role: "viewer", is_active: false, password: "attackerpassword" } });
  const platRow = (await owner`SELECT full_name, is_active FROM users WHERE id = ${plat.id}`)[0];
  check("org admin cannot modify a platform-admin account, even in the same org -> 404",
    putPlat.status() === 404 && platRow.full_name === "E2E Platform Admin" && platRow.is_active === true, `status ${putPlat.status()}`);

  const edit = await a.api.put(`/api/users/${mkBody.id}`, { data: { full_name: "Viewer Renamed", role: "inspector", is_active: true } });
  check("org admin can edit a user in their own org", edit.status() === 200 && (await j(edit))?.role === "inspector", `status ${edit.status()}`);

  // ---------- platform admin crosses orgs ----------
  const both = await j(await pa.api.get("/api/vessels"));
  check("platform admin sees vessels from BOTH orgs", new Set(both.map((v) => v.organization_id)).size >= 2, `${both.length} vessels`);
  const allUsers = await j(await pa.api.get("/api/users"));
  check("platform admin sees users from both orgs", allUsers.some((u) => u.organization_id === orgB) && allUsers.some((u) => u.email === ADMIN.email.toLowerCase()));
  const paCreate = await pa.api.post("/api/users", { data: { email: `pa-${run}@example.invalid`, password: PW, full_name: "Made By PA", role: "viewer", organization_id: orgB } });
  check("platform admin can create a user in another org", paCreate.status() === 201 && (await j(paCreate))?.organization_id === orgB, `status ${paCreate.status()}`);
  const paEdit = await pa.api.put(`/api/users/${mkBody.id}`, { data: { full_name: "PA Edited", role: "viewer", is_active: true } });
  check("platform admin can edit a user in another org", paEdit.status() === 200, `status ${paEdit.status()}`);

  // ---------- session hardening ----------
  const anon = await pwRequest.newContext({ baseURL: BASE });
  const an = await anon.get("/api/vessels", { maxRedirects: 0 });
  check("no session -> 401 on API", an.status() === 401, `status ${an.status()}`);
  const anUp = await anon.post("/api/upload?filename=x.png", { data: "x", maxRedirects: 0 });
  check("no session -> 401 on /api/upload", anUp.status() === 401, `status ${anUp.status()}`);
  const anPage = await anon.get("/vessels", { maxRedirects: 0 });
  check("no session -> pages still redirect to /login", anPage.status() >= 300 && anPage.status() < 400, `status ${anPage.status()}`);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const hdr = b64({ alg: "HS256", typ: "JWT" });
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const pl = b64({ sub: "x", email: "a@b.c", role: "admin", name: "x", organization_id: aukVessel.organization_id, is_platform_admin: true, exp });
  const forged = `${hdr}.${pl}.${crypto.createHmac("sha256", "wrong-secret").update(`${hdr}.${pl}`).digest("base64url")}`;
  const fr = await (await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { cookie: `ship_session=${forged}` } })).get("/api/vessels", { maxRedirects: 0 });
  check("forged platform-admin token (wrong key) -> 401", fr.status() === 401, `status ${fr.status()}`);
  const pl2 = b64({ email: "a@b.c", role: "admin", name: "x", exp });
  const legacy = `${hdr}.${pl2}.${crypto.createHmac("sha256", env.AUTH_SECRET).update(`${hdr}.${pl2}`).digest("base64url")}`;
  const lr = await (await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { cookie: `ship_session=${legacy}` } })).get("/api/vessels", { maxRedirects: 0 });
  check("correctly-signed legacy token (no tenant claims) -> 401", lr.status() === 401, `status ${lr.status()}`);
} catch (e) {
  check("e2e ran without unexpected error", false, e.stack);
} finally {
  // Cleanup: everything created hangs off the throwaway org. Runs even if an assertion above threw.
  try {
    if (browser) await browser.close();
    if (orgB) {
      await owner.transaction([
        owner`DELETE FROM inspections WHERE organization_id = ${orgB}`,
        owner`DELETE FROM vessels WHERE organization_id = ${orgB}`,
        owner`DELETE FROM users WHERE organization_id = ${orgB}`,
        owner`DELETE FROM organizations WHERE id = ${orgB}`,
      ]);
      const left = await owner`SELECT (SELECT count(*) FROM organizations WHERE id = ${orgB})::int AS orgs,
                                      (SELECT count(*) FROM users WHERE organization_id = ${orgB})::int AS users,
                                      (SELECT count(*) FROM vessels WHERE organization_id = ${orgB})::int AS vessels`;
      check("cleanup: test org and all its rows removed", left[0].orgs + left[0].users + left[0].vessels === 0, JSON.stringify(left[0]));
    }
  } catch (e) {
    check("cleanup completed", false, `${e.message} — remove org id ${orgB} manually`);
  }
}
console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
