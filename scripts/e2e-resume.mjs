// End-to-end "continue an in-progress inspection" check, driving the REAL form in Chromium for all
// four inspection types: save partial -> reopen -> values identical -> edit -> save -> reopen ->
// edits persisted, nothing duplicated. Also: viewer cannot edit, closed/other-org inspections
// cannot be PUT, deficiency tracking survives an update, and blobs are never deleted by the app.
//
//   E2E_CONFIRM=writes-to-live-db BASE_URL=http://localhost:3003 node scripts/e2e-resume.mjs
//
// !! Dev and production share ONE Neon database, so even against localhost this writes to the live
// DB (and uploads small files to the Blob store). Everything hangs off a throwaway organization and
// is deleted BY EXACT ID in a `finally` (rows, users, org, and the test blobs by exact URL).
//   * E2E_CONFIRM=writes-to-live-db is REQUIRED.
//   * A non-localhost BASE_URL additionally requires E2E_ALLOW_REMOTE=1.
// Needs DATABASE_URL (owner), BLOB_READ_WRITE_TOKEN in .env.local. Optional PLAYWRIGHT_CHROMIUM_PATH.
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { del } from "@vercel/blob";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";

if (process.env.E2E_CONFIRM !== "writes-to-live-db") {
  console.error("Refusing to run: this script writes (then deletes) rows in the LIVE database.\nRe-run with E2E_CONFIRM=writes-to-live-db if that is what you intend.");
  process.exit(2);
}
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname) && process.env.E2E_ALLOW_REMOTE !== "1") {
  console.error(`Refusing to run against non-local BASE_URL (${BASE}) without E2E_ALLOW_REMOTE=1.`);
  process.exit(2);
}
const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/\r$/, "").replace(/^"|"$/g, "")]; })
);
const owner = neon(env.DATABASE_URL);
const run = crypto.randomBytes(4).toString("hex");
const PW = crypto.randomBytes(12).toString("hex");
const imoFor = (six) => six + String([...six].reduce((a, d, i) => a + Number(d) * (7 - i), 0) % 10);

let failures = 0;
const check = (name, ok, detail = "") => { if (!ok) failures++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

const made = { orgs: [], users: [], inspections: [], vessels: [], blobs: [] };
let browser = null;

async function login(email) {
  const ctx = await browser.newContext({ baseURL: BASE });
  const r = await ctx.request.post("/api/auth/login", { data: { email, password: PW } });
  if (!r.ok()) throw new Error(`login failed for ${email}: ${r.status()}`);
  return ctx;
}

// Everything stored for an inspection, with ids and timestamps stripped, in a stable order.
async function snapshot(id) {
  const [h] = await owner`SELECT entered_vessel_name, entered_imo_number, inspector_name, inspection_type, status,
                                 (vessel_id IS NOT NULL) AS linked FROM inspections WHERE id = ${id}`;
  const items = await owner`SELECT section_code, prompt, grade_value, bool_value, text_value, number_value::text AS number_value,
      date_value::text AS date_value, remarks, equipment_name, equipment_model, equipment_serial, equipment_manufacturer,
      equipment_year_of_make, equipment_specifications, equipment_condition, estimated_repair_cost::text AS e1,
      annual_maint_cost::text AS e2, remaining_life_years::text AS e3, replacement_cost::text AS e4, custom_prompt, custom_kind,
      sort_order, deficiency_status, deficiency_action FROM inspection_items WHERE inspection_id = ${id}
      ORDER BY sort_order, section_code, prompt`;
  const atts = await owner`SELECT i.prompt, a.question_id IS NOT NULL AS has_q, a.file_name, a.file_url, a.file_type, a.file_size
      FROM attachments a JOIN inspection_items i ON i.id = a.inspection_item_id WHERE a.inspection_id = ${id}
      ORDER BY i.prompt, a.file_url`;
  const spares = await owner`SELECT sr_no, equipment_name, part_name, part_number, fms_spare_location, qty_per_fms::text AS q,
      actual_rob::text AS r, actual_location, reconciliation_notes FROM random_spares_check_items WHERE inspection_id = ${id} ORDER BY sr_no`;
  const capex = await owner`SELECT year_1::text, year_2::text, year_3::text, year_4::text, year_5::text, total::text FROM capex_projections WHERE inspection_id = ${id}`;
  return { h, items, atts, spares, capex, json: JSON.stringify({ h, items, atts, spares, capex }) };
}

const ALL_TYPES = [
  { type: "CONDITION", tab: "Condition Inspection", save: "Save condition inspection" },
  { type: "PRE_PURCHASE", tab: "Pre-Purchase Inspection", save: "Save pre-purchase inspection" },
  { type: "TECHNICAL", tab: "Technical Inspection", save: "Save technical inspection" },
  { type: "RIGHTSHIP", tab: "RightShip Preparation", save: "Save rightship preparation" },
];

// E2E_TYPES=CONDITION,TECHNICAL limits the run (default: all four).
const TYPES = process.env.E2E_TYPES ? ALL_TYPES.filter((t) => process.env.E2E_TYPES.split(",").includes(t.type)) : ALL_TYPES;

const panelOf = (page) => page.locator('[role=tabpanel][data-state=active]');
const CONTROLS = 'button[role=combobox][id], input[id]:not([type=file])';

// Opens a pill with at least 6 questions (so there are enough controls) and its first section.
// Returns the panel and the pill's name so the same pill can be reselected after a reload.
async function openFirstSection(page, pillName) {
  const panel = panelOf(page);
  const pills = panel.locator("button.rounded-full");
  let name = pillName;
  if (!name) {
    const texts = await pills.allInnerTexts();
    name = texts.find((t) => /\((\d+)\)/.test(t) && Number(t.match(/\((\d+)\)/)[1]) >= 6)?.replace(/\s*\(\d+\)\s*$/, "");
  }
  await pills.filter({ hasText: name }).first().click();
  await panel.locator("h3 > button").first().click();
  await page.waitForTimeout(250);
  return { panel, pill: name };
}

// Set question control #i (select option k, or type a value) and return what the form shows.
async function setControl(page, panel, i, k, text) {
  const el = panel.locator(CONTROLS).nth(i);
  const id = await el.getAttribute("id");
  const tag = await el.evaluate((e) => e.tagName);
  if (tag === "BUTTON") {
    await el.click();
    await page.getByRole("option").nth(k).click();
    await page.waitForTimeout(100);
    return { id, kind: "select", shown: (await el.innerText()).trim() };
  }
  const type = await el.getAttribute("type");
  const value = type === "number" ? text.number : type === "date" ? text.date : text.text;
  await el.fill(value);
  return { id, kind: type ?? "text", shown: value };
}
async function readControl(panel, i) {
  const el = panel.locator(CONTROLS).nth(i);
  const tag = await el.evaluate((e) => e.tagName);
  return { id: await el.getAttribute("id"), shown: tag === "BUTTON" ? (await el.innerText()).trim() : await el.inputValue() };
}
const expandBtn = (panel, i) => panel.locator('button[title="Add remarks or attach files"]').nth(i);
async function setRemark(panel, i, text) {
  await expandBtn(panel, i).click();
  await panel.locator('textarea[placeholder^="Remarks / observations"]').last().fill(text);
}
const TEXT_FILE = { name: "", mimeType: "text/plain", buffer: Buffer.from("e2e-resume test file") };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function upload(page, clickLocator, file) {
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), clickLocator.click()]);
  await chooser.setFiles(file);
}

async function saveForm(page, saveName) {
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/inspections") && ["POST", "PUT"].includes(r.request().method())),
    page.getByRole("button", { name: saveName }).click(),
  ]);
  const body = await resp.json().catch(() => ({}));
  return { status: resp.status(), id: body.id, error: body.error, method: resp.request().method() };
}

async function runType({ type, tab, save }, n, orgId) {
  const tag = `ZZ B2 ${type} ${run}`;
  const imo = imoFor("9079" + String(n) + "0");
  const ctx = await login(`e2e-inspector-${run}@example.invalid`);
  const page = await ctx.newPage();
  const label = (s) => `${type}: ${s}`;

  // ---------- 1. create a partial inspection through the real form ----------
  await page.goto("/inspections/new");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: tab }).click();
  await page.getByLabel("Vessel name").fill(tag);
  await page.getByLabel("IMO number").fill(imo);
  await page.getByPlaceholder("Inspector name").fill("E2E Inspector");
  const { panel, pill } = await openFirstSection(page);

  const vals = { text: "alpha text", number: "42.50", date: "2026-05-06" };
  const exp = [];
  exp.push(await setControl(page, panel, 0, 0, vals));
  exp.push(await setControl(page, panel, 1, 1, vals));
  exp.push(await setControl(page, panel, 3, 0, vals));
  await setRemark(panel, 0, `R0 remark ${run}`);
  await upload(page, panel.getByRole("button", { name: /Add document/ }).first(), { ...TEXT_FILE, name: `zz-b2-${run}-${type}.txt` });
  await panel.locator(`a:has-text("zz-b2-${run}-${type}.txt")`).waitFor({ timeout: 30000 });
  await setRemark(panel, 2, `R2 remark only ${run}`); // question 2 stays unanswered

  // an inspector-added question, answered, plus one left blank
  await panel.getByRole("button", { name: /Add question/ }).click();
  await panel.getByPlaceholder("Question prompt…").fill(`custom answered ${run}`);
  await panel.getByRole("button", { name: "Add", exact: true }).click();
  await panel.getByRole("button", { name: /Add question/ }).click();
  await panel.getByPlaceholder("Question prompt…").fill(`custom blank ${run}`);
  await panel.getByRole("button", { name: "Add", exact: true }).click();
  const ctrlCount = await panel.locator(CONTROLS).count();
  const customAnswered = await setControl(page, panel, ctrlCount - 2, 0, vals);

  // defect with a photo
  await page.getByRole("button", { name: "Defect List", exact: true }).click();
  await page.getByRole("button", { name: /Add defect/ }).click();
  await panel.getByPlaceholder("Describe the defect…").first().fill(`Defect one ${run}`);
  await panel.getByRole("combobox").last().click();
  await page.getByRole("option", { name: "Fire" }).click();
  await panel.getByPlaceholder("Remarks…").first().fill("defect remark");
  await upload(page, panel.getByRole("button", { name: /Add photo/ }).first(), { name: `zz-b2-${run}-${type}.png`, mimeType: "image/png", buffer: PNG });
  await panel.locator(`img[alt="zz-b2-${run}-${type}.png"]`).waitFor({ timeout: 30000 });

  // type-specific extras
  if (type === "TECHNICAL") {
    await page.getByRole("button", { name: "Random Spares Check", exact: true }).click();
    const row = panel.locator("tbody tr").first();
    const cells = row.locator("input, textarea");
    const ins = await cells.count();
    for (let c = 0; c < ins; c++) {
      const t = await cells.nth(c).getAttribute("type");
      await cells.nth(c).fill(t === "number" ? String(c + 1) : `spare-${c}`);
    }
  }
  if (type === "PRE_PURCHASE") {
    await page.getByRole("button", { name: /Equipment & CapEx/ }).click();
    const row = panel.locator("tbody tr").first();
    await row.getByPlaceholder("e.g. MAN B&W").fill("MAN");
    await row.getByPlaceholder("2014").fill("2012");
    await row.getByPlaceholder("Power, capacity, rating…").fill("7S50 spec");
    await row.getByPlaceholder("Condition details…").fill("worn");
    await row.locator('input[type=number]').first().fill("1500");
  }

  const s1 = await saveForm(page, save);
  check(label("save (POST) succeeds"), s1.status === 201 && s1.method === "POST", `status ${s1.status} ${s1.error ?? ""}`);
  const id = s1.id;
  made.inspections.push(id);
  const row1 = (await owner`SELECT vessel_id, organization_id FROM inspections WHERE id = ${id}`)[0];
  if (row1?.vessel_id) made.vessels.push(row1.vessel_id);
  check(label("stored in the test org"), row1?.organization_id === orgId);
  for (const a of await owner`SELECT file_url FROM attachments WHERE inspection_id = ${id}`) made.blobs.push(a.file_url);

  // saving AGAIN from the same open form must update, not create a second inspection
  const s1b = await saveForm(page, save);
  check(label("second Save on the same form updates (PUT), no duplicate inspection"), s1b.status === 200 && s1b.method === "PUT" && s1b.id === id, `${s1b.method} ${s1b.status}`);
  check(label("still exactly one inspection for this vessel name"), (await owner`SELECT count(*)::int AS c FROM inspections WHERE entered_vessel_name = ${tag}`)[0].c === 1);
  const snapA = await snapshot(id);

  // ---------- 2. reopen: values identical ----------
  await page.goto(`/inspections/${id}/edit`);
  await page.waitForLoadState("networkidle");
  check(label("edit page shows only this inspection's tab"), (await page.getByRole("tab").count()) === 1);
  check(label("header fields reloaded"), (await page.getByLabel("Vessel name").inputValue()) === tag && (await page.getByLabel("IMO number").inputValue()) === imo
    && (await page.getByPlaceholder("Inspector name").inputValue()) === "E2E Inspector");
  const p2 = (await openFirstSection(page, pill)).panel;
  const back = [await readControl(p2, 0), await readControl(p2, 1), await readControl(p2, 3)];
  check(label("answers reloaded identically"), exp.every((e, i) => e.id === back[i].id && e.shown === back[i].shown), JSON.stringify({ exp: exp.map((e) => e.shown), back: back.map((b) => b.shown) }));
  const unanswered = await readControl(p2, 2);
  check(label("remark-only question still unanswered"), unanswered.shown === "" || /Grade|Yes \/ No|Select/.test(unanswered.shown), unanswered.shown);
  await expandBtn(p2, 0).click();
  await expandBtn(p2, 2).click();
  const remarks = await p2.locator('textarea[placeholder^="Remarks / observations"]').evaluateAll((els) => els.map((e) => e.value));
  check(label("remarks reloaded (incl. on the unanswered question)"), remarks.includes(`R0 remark ${run}`) && remarks.includes(`R2 remark only ${run}`), JSON.stringify(remarks));
  check(label("document attachment reloaded"), (await p2.locator(`a:has-text("zz-b2-${run}-${type}.txt")`).count()) === 1);
  const c2 = await p2.locator(CONTROLS).count();
  check(label("custom questions reloaded (text, answer, blank one)"), (await p2.getByText(`custom answered ${run}`).count()) >= 1 && (await p2.getByText(`custom blank ${run}`).count()) >= 1
    && (await readControl(p2, c2 - 2)).shown === customAnswered.shown, `${(await readControl(p2, c2 - 2)).shown} vs ${customAnswered.shown}`);
  await page.getByRole("button", { name: "Defect List", exact: true }).click();
  check(label("defect reloaded with type, remarks and photo"),
    (await p2.getByPlaceholder("Describe the defect…").first().inputValue()) === `Defect one ${run}`
    && (await p2.getByPlaceholder("Remarks…").first().inputValue()) === "defect remark"
    && (await p2.locator(`img[alt="zz-b2-${run}-${type}.png"]`).count()) === 1
    && (await p2.getByRole("combobox").last().innerText()).trim() === "Fire");
  if (type === "TECHNICAL") {
    await page.getByRole("button", { name: "Random Spares Check", exact: true }).click();
    const first = await p2.locator("tbody tr").first().locator("input, textarea").evaluateAll((els) => els.map((e) => e.value));
    check(label("spares row reloaded"), first.filter(Boolean).length > 0 && first[0] === "spare-0", JSON.stringify(first));
  }
  if (type === "PRE_PURCHASE") {
    await page.getByRole("button", { name: /Equipment & CapEx/ }).click();
    const r = p2.locator("tbody tr").first();
    check(label("inventory row reloaded incl. manufacturer/year/specs/condition"),
      (await r.getByPlaceholder("e.g. MAN B&W").inputValue()) === "MAN" && (await r.getByPlaceholder("2014").inputValue()) === "2012"
      && (await r.getByPlaceholder("Power, capacity, rating…").inputValue()) === "7S50 spec" && (await r.getByPlaceholder("Condition details…").inputValue()) === "worn"
      && (await r.locator("input[type=number]").first().inputValue()) === "1500");
  }

  // a no-op Save must change nothing in the database
  const s2 = await saveForm(page, save);
  check(label("no-op save (PUT) succeeds"), s2.status === 200 && s2.method === "PUT", `status ${s2.status} ${s2.error ?? ""}`);
  const snapB = await snapshot(id);
  check(label("database identical after reopen + save (no duplicate items/attachments, nothing lost)"), snapA.json === snapB.json,
    snapA.json === snapB.json ? `${snapB.items.length} items, ${snapB.atts.length} attachments` : `items ${snapA.items.length}->${snapB.items.length}, atts ${snapA.atts.length}->${snapB.atts.length}`);

  // ---------- 3. edit, save, reopen ----------
  const p3 = panelOf(page);
  await page.getByRole("button", { name: "Defect List", exact: true }).click();
  await page.getByRole("button", { name: /Add defect/ }).click();
  await p3.getByPlaceholder("Describe the defect…").last().fill(`Defect two ${run}`);
  await page.getByRole("button", { name: /Add defect/ }).waitFor();
  // change question 0's answer + remark
  await p3.locator("button.rounded-full").filter({ hasText: pill }).first().click();
  const sec = p3.locator("h3 > button").first();
  if ((await sec.getAttribute("aria-expanded")) !== "true") await sec.click();
  await page.waitForTimeout(250);
  const before0 = await readControl(p3, 0);
  const edited0 = await setControl(page, p3, 0, 2, { text: "edited text", number: "7.25", date: "2026-07-08" });
  await expandBtn(p3, 0).click().catch(() => {});
  const ta = p3.locator('textarea[placeholder^="Remarks / observations"]');
  await ta.first().fill(`R0 remark ${run} EDITED`);
  if (type === "TECHNICAL") {
    await page.getByRole("button", { name: "Random Spares Check", exact: true }).click();
    await p3.getByRole("button", { name: /Add row/ }).click();
    const rows = p3.locator("tbody tr");
    const cells = rows.nth((await rows.count()) - 1).locator("input, textarea");
    await cells.first().fill(`edit-added-${run}`);
  }
  const s3 = await saveForm(page, save);
  check(label("edit + save (PUT) succeeds"), s3.status === 200, `status ${s3.status} ${s3.error ?? ""}`);
  const snapC = await snapshot(id);
  check(label("edit persisted: new defect added, no other item duplicated"), snapC.items.length === snapB.items.length + 1
    && snapC.items.filter((i) => i.section_code === "DEFECT_LIST").length === 2, `${snapB.items.length} -> ${snapC.items.length}`);
  check(label("edit persisted: remark and answer changed"), snapC.items.some((i) => i.remarks === `R0 remark ${run} EDITED`) && snapC.json !== snapB.json);
  check(label("attachments not duplicated by an edit"), snapC.atts.length === snapB.atts.length && new Set(snapC.atts.map((a) => a.file_url)).size === snapC.atts.length, `${snapB.atts.length} -> ${snapC.atts.length}`);
  check(label("attachment URLs unchanged (same blobs)"), JSON.stringify(snapB.atts.map((a) => a.file_url).sort()) === JSON.stringify(snapC.atts.map((a) => a.file_url).sort()));
  if (type === "TECHNICAL") check(label("spares row added by edit, none duplicated"), snapC.spares.length === snapB.spares.length + 1, `${snapB.spares.length} -> ${snapC.spares.length}`);

  await page.goto(`/inspections/${id}/edit`);
  await page.waitForLoadState("networkidle");
  const p4 = (await openFirstSection(page, pill)).panel;
  check(label("reopened after edit: edited answer shown"), (await readControl(p4, 0)).shown === edited0.shown && edited0.shown !== before0.shown, `${before0.shown} -> ${edited0.shown}`);
  await page.getByRole("button", { name: "Defect List", exact: true }).click();
  check(label("reopened after edit: both defects shown"), (await p4.getByPlaceholder("Describe the defect…").count()) === 2);
  const s4 = await saveForm(page, save);
  const snapD = await snapshot(id);
  check(label("reopen + save after edit is a no-op"), s4.status === 200 && snapD.json === snapC.json);
  await ctx.close();
  return { id, snap: snapD };
}

try {
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
  const hash = await bcrypt.hash(PW, 10);
  const mkOrg = async (name) => { const o = (await owner`INSERT INTO organizations (name) VALUES (${name}) RETURNING id`)[0].id; made.orgs.push(o); return o; };
  const mkUser = async (email, role, org) => { const u = (await owner`INSERT INTO users (email, password_hash, full_name, role, organization_id) VALUES (${email}, ${hash}, ${"E2E " + role}, ${role}, ${org}) RETURNING id`)[0].id; made.users.push(u); return u; };
  const orgA = await mkOrg(`ZZ E2E-RESUME A ${run}`);
  const orgB = await mkOrg(`ZZ E2E-RESUME B ${run}`);
  await mkUser(`e2e-inspector-${run}@example.invalid`, "inspector", orgA);
  await mkUser(`e2e-viewer-${run}@example.invalid`, "viewer", orgA);
  await mkUser(`e2e-other-${run}@example.invalid`, "inspector", orgB);

  const results = [];
  let n = 0;
  for (const t of TYPES) results.push({ t, ...(await runType(t, ++n, orgA)) });

  // ---------- 4. authorization + guards ----------
  const first = results[0];
  const viewer = await login(`e2e-viewer-${run}@example.invalid`);
  const body = { vesselName: "x", imoNumber: imoFor("907990"), vesselType: "BULK_CARRIER", inspectionType: "CONDITION", answers: {} };
  check("viewer PUT /api/inspections/:id -> 403", (await viewer.request.put(`/api/inspections/${first.id}`, { data: body })).status() === 403);
  check("viewer POST /api/inspections -> 403", (await viewer.request.post("/api/inspections", { data: body })).status() === 403);
  const vp = await viewer.newPage();
  await vp.goto(`/inspections/${first.id}/edit`);
  check("viewer opening /edit sees a read-only notice, no form", (await vp.getByText("Read-only access").count()) === 1 && (await vp.getByLabel("Vessel name").count()) === 0);
  await vp.goto("/reports");
  check("viewer sees no Continue buttons on Reports", (await vp.getByRole("link", { name: "Continue" }).count()) === 0);
  await viewer.close();

  const other = await login(`e2e-other-${run}@example.invalid`);
  check("other org PUT on this inspection -> 404", (await other.request.put(`/api/inspections/${first.id}`, { data: { ...body, inspectionType: "CONDITION" } })).status() === 404);
  const op = await other.newPage();
  await op.goto(`/inspections/${first.id}/edit`);
  check("other org opening /edit sees not found", (await op.getByText("Inspection not found").count()) === 1);
  await other.close();

  const inspCtx = await login(`e2e-inspector-${run}@example.invalid`);
  const dash = await inspCtx.newPage();
  await dash.goto("/");
  check("dashboard shows Continue on IN_PROGRESS rows", (await dash.getByRole("link", { name: "Continue" }).count()) >= 1);
  await dash.goto("/reports");
  check("reports shows Continue on IN_PROGRESS rows", (await dash.getByRole("link", { name: "Continue" }).count()) >= TYPES.length);
  const mismatch = await inspCtx.request.put(`/api/inspections/${first.id}`, { data: { ...body, inspectionType: "TECHNICAL" } });
  check("changing the inspection type via PUT -> 400", mismatch.status() === 400);

  // deficiency tracking survives an update
  const defItem = (await owner`SELECT id FROM inspection_items WHERE inspection_id = ${first.id} AND section_code = 'DEFECT_LIST' ORDER BY sort_order LIMIT 1`)[0];
  await owner`UPDATE inspection_items SET deficiency_status = 'IN_PROGRESS', deficiency_action = 'fix it' WHERE id = ${defItem.id}`;
  const pg = await inspCtx.newPage();
  await pg.goto(`/inspections/${first.id}/edit`);
  await pg.waitForLoadState("networkidle");
  const saveName = TYPES[0].save;
  await pg.getByRole("button", { name: "Defect List", exact: true }).click();
  const r5 = await saveForm(pg, saveName);
  const carried = (await owner`SELECT deficiency_status, deficiency_action FROM inspection_items WHERE inspection_id = ${first.id} AND section_code = 'DEFECT_LIST' AND prompt = ${"Defect one " + run}`)[0];
  check("deficiency status/action carried over an update", r5.status === 200 && carried?.deficiency_status === "IN_PROGRESS" && carried?.deficiency_action === "fix it");

  // scores are cleared on update
  await owner`UPDATE inspections SET overall_score = 77, condition_score = 70, management_score = 80, overall_grade = 'FAIR' WHERE id = ${first.id}`;
  await owner`INSERT INTO section_scores (inspection_id, section_code, section_title, score, total_items, graded_items, deficiency_count, organization_id)
              VALUES (${first.id}, 'X', 'X', 50, 1, 1, 0, ${orgA})`;
  const r6 = await saveForm(pg, saveName); // wait for the PUT itself, not a fixed delay
  check("score-clearing save (PUT) succeeds", r6.status === 200, `status ${r6.status}`);
  const sc = (await owner`SELECT overall_score, overall_grade, (SELECT count(*)::int FROM section_scores WHERE inspection_id = ${first.id}) AS n FROM inspections WHERE id = ${first.id}`)[0];
  check("stale scores cleared by an update", sc.overall_score === null && sc.overall_grade === null && sc.n === 0, JSON.stringify(sc));

  // blobs still exist (an update never deletes them)
  let alive = 0;
  for (const u of made.blobs) { const r = await fetch(u, { method: "HEAD" }); if (r.ok) alive++; }
  check("no blob was deleted by any save/update", alive === made.blobs.length && made.blobs.length > 0, `${alive}/${made.blobs.length} still served`);

  // closed inspections cannot be edited
  await owner`UPDATE inspections SET status = 'COMPLETED' WHERE id = ${first.id}`;
  check("PUT on a COMPLETED inspection -> 409", (await inspCtx.request.put(`/api/inspections/${first.id}`, { data: { ...body, inspectionType: "CONDITION" } })).status() === 409);
  await pg.goto(`/inspections/${first.id}/edit`);
  check("/edit on a COMPLETED inspection shows a closed notice", (await pg.getByText("This inspection is closed").count()) === 1);
  await pg.goto("/reports");
  const rowsCont = await pg.getByRole("link", { name: "Continue" }).count();
  check("no Continue on the COMPLETED row", rowsCont === TYPES.length - 1, `${rowsCont} Continue links for ${TYPES.length - 1} in-progress rows`);
  await inspCtx.close();
} catch (e) {
  check("e2e ran without unexpected error", false, e.stack);
} finally {
  // Cleanup BY EXACT ID, children before parents. Blobs are removed by exact URL (test harness only —
  // the app itself never deletes blobs).
  try {
    for (const u of new Set(made.blobs)) await del(u, { token: env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
    for (const id of made.inspections.filter(Boolean)) await owner`DELETE FROM inspections WHERE id = ${id}`;
    for (const id of made.vessels.filter(Boolean)) await owner`DELETE FROM vessels WHERE id = ${id}`;
    for (const id of made.users) await owner`DELETE FROM users WHERE id = ${id}`;
    for (const id of made.orgs) await owner`DELETE FROM organizations WHERE id = ${id}`;
    const left = (await owner`SELECT (SELECT count(*)::int FROM inspections WHERE organization_id = ANY(${made.orgs}::uuid[])) AS i,
        (SELECT count(*)::int FROM vessels WHERE organization_id = ANY(${made.orgs}::uuid[])) AS v,
        (SELECT count(*)::int FROM organizations WHERE id = ANY(${made.orgs}::uuid[])) AS o`)[0];
    check("cleanup removed everything this run created", left.i === 0 && left.v === 0 && left.o === 0, JSON.stringify(left));
  } catch (e) { check("cleanup", false, e.message); }
  await browser?.close();
}
console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
