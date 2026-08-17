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
