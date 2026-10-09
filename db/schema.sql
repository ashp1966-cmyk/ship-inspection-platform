-- =====================================================================
-- Digital Ship Inspection Platform — PostgreSQL Schema
-- Compatible with Neon and Supabase (Postgres 15+)
-- =====================================================================

-- ---------- ENUMS ----------------------------------------------------
CREATE TYPE vessel_type AS ENUM (
  'BULK_CARRIER',
  'CONTAINER_SHIP',
  'OIL_TANKER',
  'LNG_CARRIER',
  'GENERAL_CARGO',
  'LPG_TANKER',
  'CRUISE_SHIP'
);

CREATE TYPE inspection_type AS ENUM (
  'CONDITION',      -- current structural integrity / class / ops safety
  'PRE_PURCHASE',   -- enhanced: inventory + CapEx + lifecycle projection
  'TECHNICAL',      -- 321-item technical survey checklist
  'RIGHTSHIP'       -- RightShip RISQ v3.2 preparation checklist (550 questions)
);

CREATE TYPE grade AS ENUM (
  'GOOD',
  'FAIR',
  'POOR',
  'ACTION_REQUIRED',
  'NOT_SEEN',
  'NOT_APPLICABLE'
);

CREATE TYPE answer_kind AS ENUM (
  'GRADE',          -- Good / Fair / Poor / Action Required
  'YES_NO',
  'TEXT',
  'NUMBER',
  'DATE'
);

CREATE TYPE inspection_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ISSUED');

-- ---------- REQUEST CONTEXT HELPERS (used by column defaults + RLS policies) ----
-- Defined first because organization_id column defaults call app_org_id(). Both read
-- transaction-local settings that src/lib/db.ts sets from the verified JWT on every query.
CREATE OR REPLACE FUNCTION app_org_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.org_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_is_platform_admin() RETURNS boolean
  LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('app.is_platform_admin', true), '')::boolean, false) $$;

-- ---------- 0. ORGANIZATIONS (multi-tenancy; see migration 004) ----------
-- AUK is both a tenant and the platform administrator. Every tenant-scoped table
-- below carries organization_id, defaulting (migration 007) to the caller's org
-- (app_org_id()), else AUK's id for owner/migration inserts. AUK is seeded right
-- below with that exact id; app_org_id() is defined just above.
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AUK is both a tenant and the platform administrator, and every organization_id column
-- defaults to it for owner/migration inserts, so it must exist with this exact id.
INSERT INTO organizations (id, name) VALUES ('743a27f6-4b1b-4eb6-b13b-9907deb5cbb3', 'AUK');

-- ---------- 1. VESSELS -----------------------------------------------
CREATE TABLE vessels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT COALESCE(app_org_id(), '743a27f6-4b1b-4eb6-b13b-9907deb5cbb3'::uuid) REFERENCES organizations(id),
  name              TEXT NOT NULL,
  imo_number        VARCHAR(10) NOT NULL,  -- unique per organization, see vessels_org_imo_key
  vessel_type       vessel_type NOT NULL,
  flag              TEXT,
  port_of_registry  TEXT,
  class_society     TEXT,
  date_of_delivery  DATE,
  owners            TEXT,
  managers          TEXT,
  dwt               NUMERIC(12,2),
  gt                NUMERIC(12,2),
  main_engine_make  TEXT,
  main_engine_model TEXT,          -- editable in UI
  total_power_kw    NUMERIC(10,2),
  capacity_note     TEXT,          -- e.g. "51,225 m3 (Grain)" or "Liquid @98%"
  previous_names    TEXT,
  dry_dock_due      DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 2. QUESTION TEMPLATES (polymorphic by vessel type) --------
-- A section (e.g. "Structural Condition", "Cargo Holds") belongs to an
-- inspection type and is either universal (vessel_type IS NULL) or
-- specific to one vessel type. This is the mechanism that drives
-- conditional rendering in the UI.
CREATE TABLE template_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_type inspection_type NOT NULL,
  vessel_type     vessel_type,               -- NULL = applies to all types
  code            TEXT NOT NULL,             -- e.g. 'STRUCTURAL', 'CARGO_TANKS'
  title           TEXT NOT NULL,
  sort_order      INT  NOT NULL DEFAULT 0,
  UNIQUE (inspection_type, vessel_type, code)
);

CREATE TABLE template_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id    UUID NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,
  prompt        TEXT NOT NULL,
  answer_kind   answer_kind NOT NULL DEFAULT 'GRADE',
  is_required   BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0
);

-- ---------- 3. INSPECTIONS --------------------------------------------
CREATE TABLE inspections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT COALESCE(app_org_id(), '743a27f6-4b1b-4eb6-b13b-9907deb5cbb3'::uuid) REFERENCES organizations(id),
  vessel_id       UUID REFERENCES vessels(id) ON DELETE CASCADE,  -- optional link; see migration 002
  entered_vessel_name TEXT,                     -- typed Vessel Name (required by the app)
  entered_imo_number  TEXT,                     -- typed IMO Number (required by the app)
  inspection_type inspection_type NOT NULL,
  status          inspection_status NOT NULL DEFAULT 'DRAFT',
  inspector_name  TEXT,
  port            TEXT,
  started_at      DATE,
  completed_at    DATE,
  overall_grade   grade,
  overall_score    INTEGER,   -- 0-100, set by PATCH calculate_score
  condition_score  INTEGER,
  management_score INTEGER,
  executive_summary TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-section scores, written by PATCH /api/inspections/[id] calculate_score.
CREATE TABLE section_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT COALESCE(app_org_id(), '743a27f6-4b1b-4eb6-b13b-9907deb5cbb3'::uuid) REFERENCES organizations(id),
  inspection_id    UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  section_code     TEXT NOT NULL,
  section_title    TEXT,
  score            INTEGER NOT NULL DEFAULT 0,
  total_items      INTEGER NOT NULL DEFAULT 0,
  graded_items     INTEGER NOT NULL DEFAULT 0,
  deficiency_count INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inspection_id, section_code)
);

CREATE INDEX idx_inspections_vessel ON inspections(vessel_id);
CREATE INDEX idx_inspections_type   ON inspections(inspection_type, status);

-- ---------- 4. INSPECTION ITEMS (answers) ------------------------------
-- One row per answered question. Pre-Purchase-only columns are nullable
-- and simply unused for CONDITION inspections.
CREATE TABLE inspection_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT COALESCE(app_org_id(), '743a27f6-4b1b-4eb6-b13b-9907deb5cbb3'::uuid) REFERENCES organizations(id),
  inspection_id  UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  question_id    UUID REFERENCES template_questions(id) ON DELETE SET NULL,
  section_code   TEXT NOT NULL,                 -- denormalised for fast render
  prompt         TEXT NOT NULL,                 -- snapshot (templates may change)
  grade_value    grade,
  bool_value     BOOLEAN,
  text_value     TEXT,
  number_value   NUMERIC,
  date_value     DATE,
  remarks        TEXT,

  -- ---- Pre-Purchase enhanced fields (NULL for Condition inspections) ----
  equipment_name        TEXT,
  equipment_model       TEXT,     -- editable
  equipment_serial      TEXT,     -- editable
  estimated_repair_cost NUMERIC(12,2),   -- immediate CapEx, USD
  annual_maint_cost     NUMERIC(12,2),   -- recurring OpEx baseline, USD/yr
  remaining_life_years  NUMERIC(4,1),    -- inspector's estimate
  replacement_cost      NUMERIC(12,2),   -- used if remaining life < horizon
  equipment_manufacturer   TEXT,  -- migration 008
  equipment_year_of_make   TEXT,
  equipment_specifications TEXT,
  equipment_condition      TEXT,
  custom_prompt TEXT,             -- inspector-added question: its text (prompt holds the client id)
  custom_kind   TEXT,             -- ... and its answer kind

  -- ---- Deficiency tracking & alerting ----
  deficiency_status    TEXT,        -- 'OPEN' | 'IN_PROGRESS' | 'CLOSED', NULL = not a deficiency
  deficiency_action    TEXT,        -- inspector/owner's corrective action note
  deficiency_closed_at TIMESTAMPTZ, -- set automatically when status becomes CLOSED

  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_inspection ON inspection_items(inspection_id, section_code);

-- ---------- 5. VESSEL-SPECIFIC FIELDS (EAV escape hatch) ---------------
-- Rare, type-specific particulars that don't merit dedicated columns
-- (e.g. 'reefer_plug_count' for container ships, 'cargo_tank_coating'
-- for tankers, 'reliquefaction_plant' for LNG carriers).
CREATE TABLE vessel_specific_fields (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT COALESCE(app_org_id(), '743a27f6-4b1b-4eb6-b13b-9907deb5cbb3'::uuid) REFERENCES organizations(id),
  vessel_id    UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  field_key    TEXT NOT NULL,
  field_value  TEXT,
  UNIQUE (vessel_id, field_key)
);

-- ---------- 6. CAPEX PROJECTION (materialised per inspection) ----------
-- Computed in app code (see src/lib/capex.ts) and persisted so issued
-- reports are immutable even if formulas change later.
CREATE TABLE capex_projections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT COALESCE(app_org_id(), '743a27f6-4b1b-4eb6-b13b-9907deb5cbb3'::uuid) REFERENCES organizations(id),
  inspection_id  UUID NOT NULL UNIQUE REFERENCES inspections(id) ON DELETE CASCADE,
  horizon_years  INT NOT NULL DEFAULT 5,
  inflation_rate NUMERIC(4,3) NOT NULL DEFAULT 0.030,
  year_1 NUMERIC(14,2) NOT NULL DEFAULT 0,
  year_2 NUMERIC(14,2) NOT NULL DEFAULT 0,
  year_3 NUMERIC(14,2) NOT NULL DEFAULT 0,
  year_4 NUMERIC(14,2) NOT NULL DEFAULT 0,
  year_5 NUMERIC(14,2) NOT NULL DEFAULT 0,
  total  NUMERIC(14,2) NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 7. ATTACHMENTS (photos/documents attached to answers) ----------
-- Referenced by src/app/api/inspections/route.ts since the Condition tab's
-- photo-upload feature was built, but the table itself was never created —
-- every save of a question with a photo/document attached a 500'd. question_id
-- is the client-side qId string (e.g. "c01", "C01-0001", a defect row key),
-- denormalized like inspection_items.section_code — not a FK.
CREATE TABLE attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT COALESCE(app_org_id(), '743a27f6-4b1b-4eb6-b13b-9907deb5cbb3'::uuid) REFERENCES organizations(id),
  inspection_item_id  UUID REFERENCES inspection_items(id) ON DELETE CASCADE,
  inspection_id       UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  question_id         TEXT,
  file_name           TEXT,
  file_url            TEXT NOT NULL,
  file_type           TEXT,       -- 'photo' | 'document'
  file_size           INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_item        ON attachments(inspection_item_id);
CREATE INDEX idx_attachments_inspection  ON attachments(inspection_id);

-- ---------- 8. RANDOM SPARES CHECK (Technical Inspection dynamic table) ----
-- Not a fixed Q&A checklist — the inspector adds/removes rows freely while
-- spot-checking random spares against the vessel's FMS records. Shape
-- (8 free-form columns, variable row count, no "question") doesn't fit
-- inspection_items, so it gets its own table linked by inspection_id.
-- Column set mirrors db/random_spares_check_spec.json.
CREATE TABLE random_spares_check_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT COALESCE(app_org_id(), '743a27f6-4b1b-4eb6-b13b-9907deb5cbb3'::uuid) REFERENCES organizations(id),
  inspection_id         UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  sr_no                 INT NOT NULL,           -- display row number, not a DB identity
  equipment_name        TEXT,
  part_name             TEXT,
  part_number           TEXT,
  fms_spare_location    TEXT,
  qty_per_fms           NUMERIC,
  actual_rob            NUMERIC,
  actual_location       TEXT,
  reconciliation_notes  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spares_inspection ON random_spares_check_items(inspection_id, sr_no);

-- ---------- 9. USERS + PASSWORD RESET ----------------------------------
-- Referenced by src/app/api/auth/login/route.ts since it was first written
-- (SELECT * FROM users WHERE email = ... AND is_active = true), but this
-- table never actually existed in the DB or in this file until the
-- forgot-password feature was built — the login route's try/catch silently
-- fell back to the AUTH_EMAIL/AUTH_PASSWORD env-var admin every time.
-- Same "referenced in code, never created in the DB" shape as the
-- attachments table (see CLAUDE.md). Seed one admin row from the current
-- env-var credentials when deploying this so self-service reset has
-- somewhere persistent to write the new password.
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT COALESCE(app_org_id(), '743a27f6-4b1b-4eb6-b13b-9907deb5cbb3'::uuid) REFERENCES organizations(id),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'inspector',
  is_platform_admin BOOLEAN NOT NULL DEFAULT false,  -- cross-tenant visibility (RLS bypass); set deliberately, never by default
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reset tokens are stored hashed (sha256), never in plaintext — the
-- plaintext token only ever exists in the emailed link and the requester's
-- browser. Short-lived (1 hour) and single-use (used_at set on redemption).
CREATE TABLE password_reset_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- password_reset_tokens is intentionally not tenant-scoped (unauthenticated reset flow).
CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);

-- ---------- updated_at trigger ----------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vessels_updated     BEFORE UPDATE ON vessels          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inspections_updated BEFORE UPDATE ON inspections      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_items_updated       BEFORE UPDATE ON inspection_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_vessels_org ON vessels(organization_id);
CREATE UNIQUE INDEX vessels_org_imo_key ON vessels (organization_id, imo_number);  -- migration 006
CREATE INDEX idx_inspections_org ON inspections(organization_id);
CREATE INDEX idx_inspection_items_org ON inspection_items(organization_id);
CREATE INDEX idx_attachments_org ON attachments(organization_id);
CREATE INDEX idx_random_spares_check_items_org ON random_spares_check_items(organization_id);
CREATE INDEX idx_section_scores_org ON section_scores(organization_id);
CREATE INDEX idx_capex_projections_org ON capex_projections(organization_id);
CREATE INDEX idx_vessel_specific_fields_org ON vessel_specific_fields(organization_id);
CREATE INDEX idx_users_org ON users(organization_id);

-- ---------- ROW LEVEL SECURITY (migration 005) -------------------------
-- App must connect as `ship_app` (NOBYPASSRLS, non-owner); neondb_owner bypasses RLS.
-- Password for ship_app is set out-of-band, not stored here.
-- (app_org_id() / app_is_platform_admin() are defined near the top of this file, before first use.)

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vessels','inspections','inspection_items','attachments',
    'random_spares_check_items','section_scores','capex_projections',
    'vessel_specific_fields','users'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    -- FOR ALL with only USING: Postgres reuses it as WITH CHECK, so a tenant also
    -- cannot INSERT/UPDATE a row into another organization.
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = app_org_id() OR app_is_platform_admin())', t);
  END LOOP;
END $$;

-- Login / forgot-password / reset-password run BEFORE any org is known, so they can't
-- read `users` under RLS. These SECURITY DEFINER functions (run as the owner, which
-- bypasses RLS) are the only sanctioned way to do that pre-auth lookup.
CREATE OR REPLACE FUNCTION auth_find_user(p_email TEXT, p_active_only BOOLEAN DEFAULT true)
  RETURNS SETOF users LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT * FROM users WHERE email = p_email AND (NOT p_active_only OR is_active)
$$;

CREATE OR REPLACE FUNCTION auth_set_password(p_user_id UUID, p_hash TEXT)
  RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE users SET password_hash = p_hash, updated_at = now() WHERE id = p_user_id
$$;

REVOKE ALL ON FUNCTION auth_find_user(TEXT, BOOLEAN), auth_set_password(UUID, TEXT) FROM PUBLIC;
-- (EXECUTE is granted to ship_app at the end of this file, after the role exists.)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ship_app') THEN
    CREATE ROLE ship_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO ship_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  vessels, inspections, inspection_items, attachments, random_spares_check_items,
  section_scores, capex_projections, vessel_specific_fields, users,
  password_reset_tokens, organizations TO ship_app;
GRANT SELECT ON template_sections, template_questions TO ship_app;
GRANT EXECUTE ON FUNCTION app_org_id(), app_is_platform_admin(),
  auth_find_user(TEXT, BOOLEAN), auth_set_password(UUID, TEXT) TO ship_app;

