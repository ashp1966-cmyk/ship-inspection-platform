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
