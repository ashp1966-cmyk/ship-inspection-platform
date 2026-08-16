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
  used by the other two tabs.

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
