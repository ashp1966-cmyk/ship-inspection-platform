# Digital Ship Inspection Platform

A production-ready web application for **Condition Inspections** and **Pre-Purchase Inspections** of commercial vessels, with vessel-type-aware question templates, equipment inventory capture, and a 5-year CapEx/lifecycle projection module.

---

## 1. Architectural overview

```
ship-inspection-platform/
├── db/
│   ├── schema.sql                  # Postgres DDL (Neon / Supabase)
│   └── seed.sql                    # Question templates per model & vessel type
├── src/
│   ├── app/
│   │   ├── page.tsx                # Server Component — fetches vessels server-side
│   │   └── api/inspections/route.ts# Route handler — persists inspections + CapEx
│   ├── components/
│   │   └── inspection-dashboard.tsx# Client Component — Tabs, Select, Accordion,
│   │                               #   inventory Table, live 5-yr projection
│   └── lib/
│       ├── db.ts                   # Neon serverless driver
│       ├── inspection-templates.ts # Domain types + vessel-type template map
│       └── capex.ts                # Projection engine (pure, testable)
├── .env.example
└── README.md
```

Data flow: **RSC (server fetch) → client dashboard (form state) → POST /api/inspections → Postgres**, with the CapEx projection computed live client-side via `useMemo` and materialised server-side into `capex_projections` on save so issued reports are immutable.

The polymorphism problem — different vessel types needing different questions — is solved once, in the template layer: `template_sections.vessel_type` is `NULL` for universal sections and set for type-specific ones. The UI query is simply `WHERE vessel_type IS NULL OR vessel_type = $selected`, and adding a new vessel type is a seed-data change, not a code change.

## 2. Data model summary

| Table | Purpose |
|---|---|
| `vessels` | Master particulars (name, IMO, type, class, engine make/model — all editable) |
| `template_sections` / `template_questions` | Versionable question bank, polymorphic by vessel type & inspection model |
| `inspections` | One survey event per vessel per model |
| `inspection_items` | Answers; Pre-Purchase-only columns (equipment model/serial, repair cost, remaining life, replacement cost) are nullable |
| `vessel_specific_fields` | Key-value escape hatch for rare type-specific particulars (reefer plugs, tank coatings…) |
| `capex_projections` | Frozen 5-year totals per inspection |

## 3. CapEx projection logic

Per line item, per year *t* (1–5), in nominal USD:

- **Year 1:** immediate repair cost + annual maintenance
- **Years 2–5:** annual maintenance × (1.03)^(t−1) × condition multiplier (Good ×1.0, Fair ×1.25, Poor ×1.6, Action Required ×2.0)
- **Replacement:** replacement cost added in the year remaining life expires, if within the horizon

Implemented in `src/lib/capex.ts` as pure functions — unit-testable and reusable in PDF export or valuation reports.

## 4. Deployment guide (GitHub → Vercel → Neon or Supabase)

### Step A — Database

**Neon (recommended for this stack):**
1. Create a project at console.neon.tech → copy the pooled connection string.
2. In the Neon SQL editor, run `db/schema.sql`, then `db/seed.sql`.

**Supabase alternative:**
1. Create a project at supabase.com → SQL Editor → run `db/schema.sql` then `db/seed.sql`.
2. Use the **Transaction pooler** connection string (port 6543) — required for serverless functions.

### Step B — GitHub

```bash
npx create-next-app@latest ship-inspection-platform --typescript --tailwind --app
cd ship-inspection-platform
npx shadcn@latest init
npx shadcn@latest add tabs select accordion card table input badge button
npm i @neondatabase/serverless
# copy in the src/ and db/ files from this scaffold
git init && git add -A && git commit -m "feat: inspection platform v1"
gh repo create ship-inspection-platform --private --source=. --push
```

### Step C — Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo (framework auto-detected as Next.js).
2. **Settings → Environment Variables:** add `DATABASE_URL` = your Neon/Supabase pooled string, for Production, Preview and Development.
3. Deploy. Every push to `main` now auto-deploys; PRs get preview URLs with the same env.

### Step D — Verify

- `/` should list seeded vessels and render both tabs.
- Switch vessel type → type-specific accordion section appears/disappears.
- Fill Pre-Purchase inventory numbers → projection table updates live → Save → row appears in `capex_projections`.

### Local development

```bash
cp .env.example .env.local   # paste DATABASE_URL
npm run dev
```

## 5. Roadmap (post-v1)

- Auth (Vercel + Supabase Auth or Auth.js), inspector roles
- Photo attachments per item (Supabase Storage / Vercel Blob)
- PDF report generation from issued inspections
- Offline-first capture (surveys often happen with no connectivity on board)
- Grade-weighted overall scoring per section
