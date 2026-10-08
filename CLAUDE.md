@AGENTS.md

# Inspections

`src/app/inspections/new` (via `src/components/inspection-dashboard.tsx`) has three tabs, all
saving through the same `POST /api/inspections` endpoint and the same `vesselId` (optional)
link from the "Select vessel" dropdown:

- **Condition Inspection** — 205 questions, 5 category pills, from `getConditionSections()`.
- **Pre-Purchase Inspection** — Condition scope + due-diligence sections, from `getPrePurchaseSections()`.
- **Technical Inspection** — 321 questions imported from `db/technical_inspection_checklist.json`,
  grouped into 16 category pills by `getTechnicalSections()` in `src/lib/inspection-templates.ts`.
  Question ids are the checklist's own `code` values (e.g. `C01-0001`), not the `c01`-style ids
  used by the other two tabs. It also has a 17th pill, **Random Spares Check**, which is not part
  of `getTechnicalSections()` — see below.

All three tabs also have a **Defect List** pill — a dynamic add/remove list (description, type
dropdown, photo, remarks), not a fixed accordion section. See below.

## Random Spares Check (dynamic table, not a Q&A section)

Random Spares Check is a free-form reconciliation table, not a fixed checklist: the inspector
adds/removes rows on the spot while spot-checking random spares against the vessel's FMS records.
Its shape (8 free-text/number columns, variable row count, no "question") doesn't fit
`inspection_items` (one question + one answer + remarks per row), so it has its own table:

- Column definition lives in `db/random_spares_check_spec.json` — both the UI
  (`inspection-dashboard.tsx`, via `SPARES_COLUMNS`) and the DB table read from the same spec, so
  adding/renaming a column means updating the JSON, `random_spares_check_items`, and the insert in
  `src/app/api/inspections/route.ts` together.
- DB table: `random_spares_check_items`, linked by `inspection_id` (FK → `inspections`, same
  pattern as `inspection_items`/`capex_projections`), with a `sr_no` display column instead of a
  DB-generated identity. Added to `db/schema.sql` and the live Neon DB — same
  hand-maintained-mirror caveat as the `inspection_type` enum below.
- The UI keeps rows in `sparesRows` state (starts with 5 blank rows, "Add row" appends, ✕ deletes)
  and renders them as an editable `Table`, not an `Accordion` — selected via the pill key
  `"spares_check"` in the Technical Inspection tab, bypassing `renderSectionAccordion`.
- On save, `sparesCheck` is sent alongside `answers`/`inventory` in the same
  `POST /api/inspections` body (so it lands under the same `inspection_id` as the rest of the
  Technical Inspection), and rows where every field is blank are dropped before insert.

## Defect List (dynamic list, reuses inspection_items — no new table)

Defect List (Condition/Pre-Purchase/Technical, pill key `"defect_list"`) is a dynamic add/remove
list like Random Spares Check, but its shape — one free-text description, a type dropdown, remarks,
and an optional photo — is close enough to the normal Q&A row shape that it's saved through the
*existing* `inspection_items` + `attachments` tables rather than a new one:

- `prompt` holds the defect description (the user's typed text — unlike the rest of the app, where
  `prompt` is a denormalized copy of a static question, here it *is* the answer, so storing it
  directly is correct, not the `qId`-as-prompt shortcut noted above).
- `text_value` holds the defect type (one of the 9 fixed options — Safety, Fire, Environment,
  Structural, Machinery, Navigation, Pollution Prevention, Regulatory/Documentation, Other).
- `remarks` maps directly to the remarks column.
- `section_code = 'DEFECT_LIST'` marks these rows for querying/filtering.
- The photo reuses the exact same mechanism as every other question's photo: each defect row gets
  a client-generated `rowKey`, which stands in for `qId` in the shared `attachments` state map and
  is passed straight to the existing `triggerUpload`/`handleFileSelect` functions unchanged. On
  save, `POST /api/inspections` looks up `attachments[row.rowKey]` and inserts into `attachments`
  with `question_id = row.rowKey`, same as the main answer loop.
- Rows are per-inspection-type (`defectRows: Record<"CONDITION"|"PRE_PURCHASE"|"TECHNICAL",
  DefectRow[]>` in `inspection-dashboard.tsx`), sent as `defects` in the save body, and rows with
  no description are dropped before insert.

This is the "reuse vs. new table" call working the other way from Random Spares Check: Random
Spares Check's 8 columns (equipment/part/location/qty/etc.) had no honest mapping onto
`inspection_items`, so it got its own table; Defect List's 3 free-form fields map cleanly onto
`prompt`/`text_value`/`remarks`, which already exist and are already unused by anything else for
these synthetic rows, so reusing them was the right call.

## Recurring pattern: things referenced in code that were never created in the DB

Third instance of this shape (after `question_id`-as-UUID and the vessel `""`→DATE/NUMERIC bug
above) — while wiring up Defect List's photo upload, found that **the `attachments` table didn't
exist in the database at all**, despite `POST /api/inspections` inserting into it since the
Condition tab's photo-upload feature was built, and despite not being in `db/schema.sql` either.
Confirmed directly: `POST /api/inspections` with any question given a photo/document threw
`relation "attachments" does not exist` and failed the *entire* inspection save with a 500 — not
just silently dropping the attachment. Fixed by creating the table (matching exactly the columns
the code already expected: `inspection_item_id`, `inspection_id`, `question_id`, `file_name`,
`file_url`, `file_type`, `file_size`) in both `db/schema.sql` and the live Neon DB. Photo/document
attachments on any tab (not just the new Defect List) work now for the first time.

**Lesson for next time:** before building a feature that depends on an existing table/column
mentioned in code or docs, verify it actually exists in the live DB (`information_schema.tables`/
`.columns`) rather than trusting the code path or `db/schema.sql` — this codebase has a
established habit of code and schema drifting out of sync in both directions (`schema.sql` missing
things the DB has, and — this time — code assuming a table that neither the DB nor `schema.sql`
ever had).

## Regression: a "feature" commit silently reverted three prior commits by editing from a stale copy

Commit `38dbd38` ("feat: clickable cards, NA option, PP vessel sections, equipment specs")
rewrote `src/components/inspection-dashboard.tsx` and `src/lib/inspection-templates.ts` from a
copy of those files that predated `57c5a6b` (Technical Inspection tab), `f0e2d89` (Random Spares
Check) and `e3441b7` (Defect List). The commit's own intended changes — the enhanced Equipment
Inventory columns (manufacturer/year/specifications/condition), the simplified due-diligence
Pre-Purchase layout, and the dashboard-overview clickable-cards work — were real and correct, but
because the starting point for the diff was stale, saving it also deleted, in one shot: the
`getTechnicalSections()`/`technical_inspection_checklist.json` import, the Technical Inspection
`TabsTrigger`/`TabsContent` (dropping `TabsList` back to `grid-cols-2`), `getTechnicalSections`
itself from `inspection-templates.ts`, the Random Spares Check table/state, the Defect List
table/state for all three inspection types, the category-pill sub-tab navigation
(`renderGroupPills`/`QUESTION_GROUPS`), and the AI photo-grading feature
(`analyzePhoto`/`gradeSuggestions`). None of that removal was mentioned in the commit message or
was an intentional part of "clickable cards, NA option, PP vessel sections, equipment specs" —
it was silent collateral damage from editing a stale base file, not a deliberate rollback.

**Symptom:** the Technical Inspection tab (and, less visibly, Random Spares Check, Defect List,
and the pill-based section navigation on all three tabs) simply stopped rendering — no error, no
crash, just a `TabsList` with two triggers instead of three, because the third `TabsTrigger` no
longer existed in the file.

**Fix:** restored `inspection-dashboard.tsx` from `e3441b7` (the last commit with all three
features intact) and re-layered `38dbd38`'s genuinely new Equipment Inventory columns on top of
the restored file's PP equipment table; restored `getTechnicalSections()` (plus its
`TechnicalChecklistItem` type, `GROUP_LABEL_FIXUPS`, `slugifyGroup`, and the
`technical_inspection_checklist.json` import) into `inspection-templates.ts`, which had also lost
it in the same commit.

**Lesson for next time:** before starting a UI/feature change to a file that's been touched by
several recent commits, diff the working copy against `HEAD` (or check `git log -p -3 -- <file>`)
to confirm the file you're about to edit still contains the most recent commits' work — don't
assume an open editor buffer or a cached copy is current. After finishing a change to a
long-lived, frequently-edited component, run `git diff <previous-commit> HEAD -- <file>` (not
just `git diff` against the working tree) and skim it for large deletions of code you didn't mean
to touch — a stale-base overwrite shows up as a huge, unrelated deletion block sitting right next
to the intended, legitimate change.

### Second fallout from the same event: the `e3441b7` restore point was itself incomplete for `inspection-templates.ts`

The fix above (commit `14c8d79`) restored `inspection-dashboard.tsx` **in full** from `e3441b7`,
but only **partially** restored `inspection-templates.ts` — it re-added just `getTechnicalSections()`
and left the rest of the file as `38dbd38` had rewritten it. That left two more casualties of the
same stale-base overwrite undiscovered for a day:

1. **Pre-Purchase lost the entire Condition-scope question set.** `38dbd38` restructured
   `getPrePurchaseSections()` from `[...getConditionSections(vesselType), ...prePurchaseOnly]`
   (the `e3441b7` shape — full Condition scope plus due-diligence extras) to
   `[...universalPrePurchase, ...typeSpecificPrePurchase.filter(...)]` — dropping the
   `getConditionSections(vesselType)` spread entirely. Pre-Purchase went from ~300+ questions
   (full Condition scope + due diligence) down to ~44–50 (due diligence only).
2. **Several Condition sections lost real question content**, not just renames — comparing
   per-section-code question counts between `e3441b7` and the post-`14c8d79` state:
   `DECK_MACHINERY` 20→11, `ENGINE_ROOM` 32→25, `HULL_DECKS` 28→18, `NAVIGATION` 29→19,
   `POLLUTION` 23→15, `SAFETY_MGMT` 34→23, `EQUIP_TESTS` 23→20, `CARGO_HOLDS` 15→12,
   `CARGO_TANKS` 5→4, `BALLAST` 7→6 — while other sections in the same file were untouched
   (`CERTIFICATION` 19=19, `CREW_MGMT` 18=18, `CONTAINER_SYS` 5=5, `STRUCTURAL` 8=8). This
   selective, section-by-section trimming (rather than a uniform cut) is the signature of the
   same "rewritten from a stale/condensed copy" damage as the Technical tab loss, just inside
   `inspection-templates.ts`'s question arrays instead of `inspection-dashboard.tsx`'s tab wiring.
3. **`38dbd38` also legitimately renamed** the due-diligence section codes
   (`CLASS_SURVEY_STATUS`→`CLASS_STATUS`, `DOC_REVIEW_PP`→`DOC_REVIEW`, `VESSEL_PERFORMANCE`→
   `PERFORMANCE`, `SPACES_INSPECTED`→`SPACES_INSPECTION`, `DEFICIENCY_REGISTER`→`DEFICIENCY_REG`)
   and **genuinely added** a new feature — splitting the old single universal
   `CARGO_MACHINERY_PARTICULARS` section (6 questions, shown to every vessel type) into 7
   vessel-type-specific "G. ... Verification" sections (`CARGO_GEAR_VERIFY` for bulk carriers,
   `CARGO_SYS_VERIFY` for tankers, `GAS_SYS_VERIFY` for LNG, etc. — this is what the commit
   message's "PP vessel sections" phrase meant). Because `inspection-dashboard.tsx` was restored
   from `e3441b7` (which still had the old code names and no `*_VERIFY` codes),
   `DUE_DILIGENCE_GROUP.codes` no longer matched anything in the templates file — the whole
   Due Diligence pill's section list silently mismatched, on top of problem #1.
   Two Condition-only section codes, `HULL_DECKS` and `EQUIP_TESTS`, were *also* never listed in
   `QUESTION_GROUPS` at all — not a `38dbd38`/`14c8d79` regression, this gap already existed in
   `e3441b7` and further back — so those two sections' questions existed in the data but had never
   rendered in any pill, on Condition or Pre-Purchase, since sub-tab grouping was introduced.

**Fix (this round):** spliced `e3441b7`'s full `universalCondition` + `typeSpecificCondition`
arrays back into `inspection-templates.ts` (restoring the trimmed question counts above) while
keeping everything `38dbd38` legitimately added on top — the enhanced `EquipmentItem` fields, the
`*_VERIFY` vessel-specific due-diligence sections, and the renamed due-diligence codes. Changed
`getPrePurchaseSections()` back to
`[...getConditionSections(vesselType), ...universalPrePurchase, ...typeSpecificPrePurchase.filter(...)]`.
Updated `DUE_DILIGENCE_GROUP.codes` in `inspection-dashboard.tsx` to the current section codes
(`CLASS_STATUS`/`DOC_REVIEW`/`PERFORMANCE`/`SPACES_INSPECTION`/`DEFICIENCY_REG` plus all 7
`*_VERIFY` codes), and added `HULL_DECKS` to the `structural` `QUESTION_GROUPS` entry and
`EQUIP_TESTS` to `machinery` so every section code that exists in `inspection-templates.ts` is
claimed by exactly one pill — verified with a script (`grep -oE 'code:\s*"[A-Z_]+"' ... | sort -u`
against `QUESTION_GROUPS`/`DUE_DILIGENCE_GROUP`) that no orphaned section codes remain.

**Confirmed safe / lost commit range, so a third occurrence doesn't need re-investigation:**
- `e3441b7` (Defect List commit) — last commit where **`inspection-dashboard.tsx`** was fully
  correct (Technical tab, Random Spares Check, Defect List, AI photo grading, group-pill nav all
  present). **Not** fully correct for `inspection-templates.ts` question *content* by the
  standard of "what should exist" — it had the full 331-question Condition/PP set and the old
  due-diligence code names, but not yet the `*_VERIFY` vessel-split or the enhanced `EquipmentItem`
  fields (those were genuinely new in the next commit).
- `38dbd38` — the stale-base rewrite. Lost, relative to `e3441b7`: Technical Inspection tab,
  Random Spares Check, Defect List, AI photo grading, group-pill navigation (all in
  `inspection-dashboard.tsx`), `getTechnicalSections()` (in `inspection-templates.ts`), the
  Condition-scope merge inside `getPrePurchaseSections()`, and real question content inside
  `DECK_MACHINERY`/`ENGINE_ROOM`/`HULL_DECKS`/`NAVIGATION`/`POLLUTION`/`SAFETY_MGMT`/
  `EQUIP_TESTS`/`CARGO_HOLDS`/`CARGO_TANKS`/`BALLAST`. Gained, legitimately: enhanced
  `EquipmentItem` fields, the `*_VERIFY` per-vessel-type due-diligence split, renamed due-diligence
  codes, and the dashboard-overview clickable-cards work (a separate file, not touched by either
  restore).
- `14c8d79` (first fix) — fully correct for `inspection-dashboard.tsx`. Still carried forward
  `38dbd38`'s truncated `inspection-templates.ts` content (only patched in `getTechnicalSections`),
  so Pre-Purchase question count and vessel-type filtering remained broken until this second fix.
- **After this second fix, before it was committed**, a full line-by-line `diff` of `e3441b7` vs
  `38dbd38` was run on both files (not just a re-check of the two already-known items) to look for
  any other casualty. It found one more: **`universalInventory`/`typeInventory` in
  `inspection-templates.ts`** (the default-row lists for the Pre-Purchase Equipment Inventory
  table) had also been trimmed by `38dbd38` — missing "ME Flow Meter" and "MGPS (Marine Growth
  Prevention System)" from `MACHINERY_INV`; "Aldis Lamp", "Navtex Receiver" and "Gyro Compass" from
  `NAV_COMMS_INV`; "Fixed Foam System" from `SAFETY_INV` (and its two "Portable Gas Detectors"
  variants merged into one); and "Cargo Heaters/Vaporisers" from the `LNG_CARRIER` type-specific
  list. Restored all of these. Confirmed via a section-by-section question-count diff script
  (`e3441b7` vs the working tree, not vs `HEAD` — the fixes were still uncommitted at diff time,
  so diffing against `HEAD` here would have shown false regressions) that every other section now
  matches `e3441b7` exactly, with the only remaining differences being `38dbd38`'s legitimate,
  intentional additions (enhanced `EquipmentItem` fields, `*_VERIFY` sections, renamed
  due-diligence codes, reworded due-diligence question text).
- **Current working tree (pending commit)** is the first state where both files are believed fully
  reconciled: all of `e3441b7`'s content restored (Condition/PP question arrays *and* the equipment
  inventory default-row lists), all of `38dbd38`'s genuine additions kept, plus the pre-existing
  `HULL_DECKS`/`EQUIP_TESTS` pill-orphaning bug (present since sub-tab grouping was introduced,
  unrelated to either stale-base incident) fixed as a byproduct of reconciling the two files. If a
  third symptom surfaces in either file, it did **not** originate in `38dbd38` — start from
  `git diff` against *this* commit (once made) instead of re-diffing `e3441b7`.

`inspection_type` (Postgres enum in `db/schema.sql`) has three values: `CONDITION`,
`PRE_PURCHASE`, `TECHNICAL`. New enum values must be added both to `db/schema.sql` and to the
live Neon DB via `ALTER TYPE inspection_type ADD VALUE ...` — the schema file is not
auto-applied, it's a hand-maintained mirror of what's actually been run against the DB (see
`db/schema.sql` — the deficiency-tracking columns were added there after-the-fact for the same
reason).

`inspection_items.question_id` is a UUID FK to `template_questions`, a table the app never
populates (templates are hardcoded in `inspection-templates.ts`, not DB-driven). Do not insert
front-end question ids (`c01`, `C01-0001`, etc.) into it — they aren't UUIDs and the insert will
fail with `invalid input syntax for type uuid`. `src/app/api/inspections/route.ts` omits that
column entirely; the question id is only stored (denormalized) in `prompt` /
`inspection_items.section_code` derivation (`qId.split("-")[0]`).

## Recurring pattern: unhandled `""` for optional DATE/NUMERIC columns

Second time this exact shape of bug has turned up (first was the `question_id` UUID insert
above) — an API route inserts a raw form value into a typed column with only `?? null` as
guarding, which doesn't catch `""`. Postgres rejects `""` for `DATE`/`NUMERIC` columns with
`invalid input syntax for type date/numeric`, not for `TEXT` columns, so it only bites on the
non-text optional fields.

Found in `src/app/api/vessels/route.ts` (POST) and `src/app/api/vessels/[id]/route.ts` (PUT): the
Vessels form (`vessels-list.tsx`) defaults every optional field — including `date_of_delivery`,
`dry_dock_due`, `dwt`, `gt`, `total_power_kw` — to `""`, and `b.dwt ?? null` passes that `""`
straight through. Creating a vessel without filling in every optional field (the normal case)
threw a 500 on every request. **Compounding bug on the frontend:** `vessels-list.tsx`'s
`saveVessel()` never checked `res.ok` — it treated the error-JSON response as if it were the
saved vessel, pushed it into local state, and closed the modal, so the failure was invisible to
the user. Net effect: the vessels table was permanently empty, so the "Select vessel" dropdown on
all three inspection tabs correctly showed "0 vessels registered" — the dropdown/link-by-`vesselId`
logic itself was never broken (all three tabs already share one `<select>` and one `selectedVessel`
state in `inspection-dashboard.tsx` — there's no per-tab implementation to diverge).

Fix: both routes now coerce `""` → `null` for every optional field via a local `blank()` helper
before the query, and wrap the insert/update in try/catch returning `{error}` with a non-200
status (matching the pattern in `api/inspections/route.ts`). `saveVessel()` now checks `res.ok`
and surfaces `saveError` in the modal instead of silently "succeeding".

**When adding a new form-backed table/column:** any optional DATE or NUMERIC field fed from a
text input needs the same `""` → `null` coercion, and any fetch-based save handler needs to check
`res.ok` before treating the response as success.

## New bug shape: DATE columns come back as JS `Date` objects, not strings

Found while investigating "vessel dates don't save right" — the write path was already correct
(the `blank()` coercion above handles it, and `date_of_delivery`/`dry_dock_due` were stored
exactly as typed). The bug is on the *read* path: the Neon driver (`@neondatabase/serverless`)
parses Postgres `DATE` columns into JS `Date` objects built from local calendar components (local
midnight), not plain strings. Every place that does `SELECT * FROM vessels` (or `RETURNING *`)
and hands the row to `NextResponse.json()` or straight to a client component was serializing that
`Date` via `toISOString()`, producing a full UTC timestamp like `"2015-05-31T22:00:00.000Z"`
instead of `"2015-06-01"`. Two distinct symptoms depending on server/client timezone:

- If the server's TZ is ahead of UTC, the date **silently shifts back a day** on every read
  (confirmed directly against the live DB: inserting `2015-06-01` and reading it back on this
  machine, TZ `Africa/Johannesburg`/UTC+2, returned `2015-05-31T22:00:00.000Z`).
- Regardless of TZ, the ISO-timestamp string is not a valid `<input type="date">` value (browsers
  require a bare `YYYY-MM-DD`), so `vessels-list.tsx`'s `openEdit()` — which assigns the fetched
  value straight into form state — left the Date of Delivery / Dry Dock Due fields **blank on
  every edit-reload**, even though the correct value was sitting in the database the whole time.

This is a fourth instance of the "recurring pattern: things referenced in code that were never
created in the DB" family in spirit (code assumed the DB driver hands back strings for DATE
columns; it doesn't), but it's a genuinely different root cause from the `""`→`null` bug above —
that one was a write-path bug (bad value going in), this one is a read-path serialization bug
(good value coming back mangled). Don't conflate the two when debugging future date issues: check
`typeof value` on what the driver returns before assuming either fix applies.

Fixed with `dateStr()` in `src/lib/db.ts` — converts a driver `Date` back to `YYYY-MM-DD` using
**local** getters (`getFullYear`/`getMonth`/`getDate`), matching how the driver built the Date in
the first place, so it's correct regardless of the running server's TZ. Applied everywhere a
vessel row's `date_of_delivery`/`dry_dock_due` reaches JSON or a client component: both handlers
in `api/vessels/route.ts`, both in `api/vessels/[id]/route.ts`, and the two server components
`app/vessels/page.tsx` / `app/vessels/[id]/page.tsx`.

**When adding a new DATE column anywhere in this app:** any query that returns it (`SELECT *` or
`RETURNING *`) needs `dateStr()` applied before the row reaches `NextResponse.json()` or a client
component — don't assume the driver gives you back what you put in. `inspections.started_at` /
`completed_at` and `capex_projections.date_value` are the same `DATE` type and carry the same
latent risk, but are currently read-only display values (formatted with `fmt()`, never fed back
into an editable `<input type="date">`), so the blank-on-reload symptom doesn't apply — only the
TZ-shift-on-display one would, and only for viewers in a different TZ than the server. Not fixed
here since it's out of scope for the vessel-date bug and no editable date input touches them; revisit
if those dates start being edited or become the same style off-by-one.

## Incident: "A server error occurred" site-wide + broken Forgot Password — turned out to be two unrelated bugs, NOT the custom domain

When `https://inspections.auk-maritime.com` (a custom domain added to this Vercel project) started
showing "A server error occurred" on every load, the working hypothesis was a stale site-URL env
var left over from before the domain was connected (this app previously had no custom domain, only
the `*.vercel.app` URL) — specifically that `NEXTAUTH_URL` or similar didn't match the new origin.
**That hypothesis was wrong and this app doesn't have that failure mode at all**: there is no
NextAuth here — auth is fully custom (`src/proxy.ts`, Next 16's renamed `middleware.ts`, gates
routes by verifying a `ship_session` JWT cookie; `POST /api/auth/login` issues it). No code path
compares the configured site URL against the request origin, so a custom-domain mismatch of that
specific kind cannot produce this symptom in this app.

**Actual root cause (from `vercel logs`, not guessed):**
```
Error [NeonDbError]: password authentication failed for user 'neondb_owner'
```
on `GET /` (the dashboard queries `vessels`/`inspections`/`inspection_items` counts on every
load — see `src/app/page.tsx`). The Neon database password had been rotated/reset independently
of Vercel and independently of the domain change — `DATABASE_URL` in both Vercel and
`.env.local` still had the old password. Confirmed by reproducing the identical error running a
query locally with the same (stale) connection string. **This had nothing to do with the domain
being added** — it would have broken the old `*.vercel.app` URL identically; it was coincidental
timing, not causation. `/login` itself rendered fine (200) throughout, because the login page
does no DB query — only pages/routes that hit the DB (`/`, most API routes) were affected, which
is why the symptom looked like "the whole site is down" rather than "the database is down": the
one page that still worked was the one most people would try first while troubleshooting.

**Fix:** obtained a fresh Neon connection string, updated `DATABASE_URL` in `.env.local` and in
Vercel (production; preview environment update was blocked by a `vercel env add ... preview` CLI
quirk requiring a git-branch argument that kept re-prompting even when following its own suggested
fix — do via the Vercel dashboard if preview deploys need it), then redeployed and verified via
`vercel logs` (no more `NeonDbError`) and by logging in + loading `/` end-to-end against production.

**When a custom domain is added to this (or any) Vercel project going forward:**
1. Don't assume a site-wide error after a domain change is caused by the domain change — pull
   `vercel logs` for the *actual* stack trace first. This app has been bitten before by
   guessing at root causes from symptoms alone (see the `38dbd38` stale-overwrite section above);
   the same discipline applies to infra incidents, not just code regressions.
2. This app has no `NEXTAUTH_URL`/site-URL config that a domain change could invalidate for auth
   itself. The one place a site URL *is* used is `NEXT_PUBLIC_APP_URL`, consumed only by
   `src/app/api/alerts/route.ts` (deficiency alert emails) and the new
   `src/app/api/auth/forgot-password/route.ts` (reset-link emails) to build an absolute link in
   an email body — if that var is still the old `*.vercel.app` value after a domain switch, alert
   and reset-password emails will link to the wrong host (the email still sends, it just points
   to the old URL). Update `NEXT_PUBLIC_APP_URL` to the new canonical domain whenever one is added.
3. A DB credential failure and a domain change are easy to conflate if they happen close together
   in time — they are almost always unrelated. Test the DB connection string in isolation
   (`node -e` a one-line query against `DATABASE_URL`, same as this incident) before assuming
   anything domain- or routing-related is the cause of a 500 that only shows up on
   database-touching routes.

### Side finding: this app's Neon database is shared with an unrelated application

While investigating, `information_schema.tables` on the live `neondb` database (same host as
`DATABASE_URL`) showed this app's tables (`vessels`, `inspections`, `inspection_items`,
`attachments`, `capex_projections`, `random_spares_check_items`, `template_sections`,
`template_questions`, `vessel_specific_fields`, now also `users`/`password_reset_tokens`)
**alongside a completely unrelated set** — `Admin`, `Booking`, `Course`, `Enrollment`,
`Facilitator`, `Learner`, `Certificate`, `CategoryMeta`, `PayfastSecret`, `RateLimit`, `Research`,
`ResearchInterest`, `Session`, `SiteSettings`, `PasswordResetToken` — Prisma-style PascalCase
names, almost certainly belonging to a different AUK project (likely the training/LMS platform,
`auk-marine-training`, going by the Course/Enrollment/Certificate/Learner domain and the
Vercel org's other projects). No table-name collision occurred here (this app's new tables are
lowercase `users`/`password_reset_tokens`; the other app's are PascalCase, including its own
unrelated `PasswordResetToken`), but this means the two apps share one Neon database/credential
set. A password rotation, extension change, or destructive migration on either app's behalf
risks the other. Not fixed as part of this incident (out of scope, and splitting a live shared
DB is a deliberate, coordinated migration, not a quick fix) — worth deliberately separating into
its own Neon project/database next time either app's schema needs a significant change, and worth
checking `information_schema.tables` for unexpected tables before assuming a "table doesn't
exist" or "table already exists" error belongs to this app's own migration history.

## Forgot Password: was a non-functional UI stub, now a real email-based reset flow

`src/app/login/page.tsx`'s "Forgot password?" was a plain `<span>` with no `onClick`, no `href`,
and no backing route or endpoint anywhere in the codebase — clicking it did nothing. It was
never wired up, not broken by a regression. Unrelated to the Neon incident above (the two were
reported together but have independent root causes and independent fixes).

Also found while building the fix: `/api/auth/login` has queried `SELECT * FROM users WHERE
email = ... AND is_active = true` since it was first written, but the `users` table never
existed in `db/schema.sql` or the live DB — another instance of the "recurring pattern: things
referenced in code that were never created in the DB" family documented above. It never
surfaced as a crash because the route wraps that query in try/catch and falls back to the
`AUTH_EMAIL`/`AUTH_PASSWORD` env-var admin on any DB error — so every login before this fix
silently used the env-var path, DB or no DB.

**Fix:** added `users` and `password_reset_tokens` tables to `db/schema.sql` and the live DB (see
their comments in `db/schema.sql` for the exact shape), migrated the env-var admin into a real
`users` row with its password bcrypt-hashed (cost 12, via `bcryptjs` — already a dependency,
already used by the DB-user path in `/api/auth/login`; no new library introduced), and built:
- `POST /api/auth/forgot-password` — looks up the user, and always returns the same generic
  message regardless of whether the email matched (prevents user enumeration); on a match,
  stores a sha256 hash of a random 32-byte token (never the plaintext) with a 1-hour expiry in
  `password_reset_tokens`, and emails the plaintext reset link via Resend (same
  `RESEND_API_KEY`/`fetch("https://api.resend.com/emails")` pattern as
  `src/app/api/alerts/route.ts`), built from `NEXT_PUBLIC_APP_URL` — see the note above about
  keeping that var current after a domain change.
- `POST /api/auth/reset-password` — hashes the submitted token, checks it against
  `password_reset_tokens` for an unused, unexpired match, updates `users.password_hash`
  (bcrypt, cost 12), and marks the token used (single-use, verified directly against
  production: re-submitting the same token after a successful reset now gets rejected).
- `src/app/forgot-password/page.tsx` and `src/app/reset-password/page.tsx` — new pages, styled
  to match `src/app/login/page.tsx`; `src/proxy.ts`'s public-route allowlist was extended to
  include both so the session-required redirect doesn't block them.
- The login page's "Forgot password?" now links to `/forgot-password` instead of being inert.

Verified end-to-end directly against `https://inspections.auk-maritime.com` (API calls, not
just local/unit-level): requested a reset, confirmed the token row landed in
`password_reset_tokens`, completed the reset with a freshly generated token, confirmed
`users.password_hash` actually changed and the new password verifies via `bcrypt.compare`, and
confirmed a second attempt to reuse the same token is rejected. The admin's original password was
restored immediately after the test so it still matches the documented `AUTH_PASSWORD` env var.

**When adding any other DB-backed feature to this app going forward:** check
`information_schema.tables`/`.columns` against the *live* DB before trusting that a table a route
already queries actually exists — this is now the fourth+ time in this codebase that code assumed
a table which was never created (see `attachments` above, and now `users`). A try/catch fallback
can hide this for a long time, exactly as it did here.

## RightShip Preparation (4th inspection tab)

`RightShip Preparation` (`inspection_type = 'RIGHTSHIP'`) is the RISQ v3.2 questionnaire: 550
questions in 26 sections (1–17 incl. 7A–7D, 8A–8F, 9A/9B), imported from
`db/rightship_preparation_checklist.json` by `getRightShipSections()` in
`src/lib/inspection-templates.ts`. Same wiring as Technical (pills + accordions + Defect List),
saved through the same `POST /api/inspections` — no route changes.

- Question ids are `RS{section}-{risqId}` (e.g. `RS7B-7.1`), because RISQ numbering restarts inside
  lettered sub-sections (7B starts at 7.1). This also makes the route's `qId.split("-")[0]`
  `section_code` come out as `RS7B`. Don't use bare RISQ ids.
- New `answerKind: "CHOICE"` (with `options`) renders a Select and is stored verbatim in
  `text_value`. RISQ yes/no questions use it (Yes/No/N/A/N/V) rather than `YES_NO`, because
  `YES_NO` has no N/V and saves `bool_value = (v === "YES")`, which would collapse No/N/A/N/V.
- `guide` renders as a muted caption under the question; `mandatory`/`verify` as small M / V marks.
- Enum migration: `db/migrations/001_add_rightship_inspection_type.sql` (applied to live Neon;
  mirrored in `db/schema.sql`).
- Known pre-existing issue, not RightShip-specific: `inspections.vessel_id` is NOT NULL in the live
  DB, so saving any tab without a selected vessel returns 500 even though the UI says "optional".

## Inspections: vessel link is optional; Vessel Name + IMO Number are the required fields

`inspections.vessel_id` is nullable (migration `db/migrations/002_inspections_vessel_id_nullable.sql`,
applied to live Neon; it was NOT NULL before, so every save without a selected vessel 500'd despite
the UI saying "optional"). The typed identity lives on the inspection itself in
`entered_vessel_name` / `entered_imo_number`. Required at both layers: `saveInspection()` in
`inspection-dashboard.tsx` blocks blank name/IMO client-side (selecting a vessel prefills them),
and `POST /api/inspections` returns 400 if either is blank. Readers show
`COALESCE(v.name, i.entered_vessel_name)` / `COALESCE(v.imo_number, i.entered_imo_number)` and must
`LEFT JOIN vessels` (the dashboard's two inner JOINs were changed so unlinked inspections don't vanish).

## Scoring schema: section_scores + inspections score columns (migration 003)

`GET /inspections/[id]` and `GET /api/inspections/[id]` 500'd for every inspection because
`section_scores` was never created — another instance of the "code references a table that
doesn't exist" pattern. Columns were inferred from the PATCH `calculate_score` insert and the
inspection-manager reader; `UNIQUE (inspection_id, section_code)` is required by that insert's
`ON CONFLICT`. The same PATCH also writes `inspections.overall_score/condition_score/
management_score`, which didn't exist either (and `/vessels/[id]` selects `overall_score`), so
migration `db/migrations/003_section_scores_and_inspection_scores.sql` adds all of it (scores are
`Math.round`ed 0–100 integers from `src/lib/grading.ts`).
