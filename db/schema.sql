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
  'PRE_PURCHASE'    -- enhanced: inventory + CapEx + lifecycle projection
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

-- ---------- 1. VESSELS -----------------------------------------------
CREATE TABLE vessels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  imo_number        VARCHAR(10) UNIQUE NOT NULL,
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
  vessel_id       UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  inspection_type inspection_type NOT NULL,
  status          inspection_status NOT NULL DEFAULT 'DRAFT',
  inspector_name  TEXT,
  port            TEXT,
  started_at      DATE,
  completed_at    DATE,
  overall_grade   grade,
  executive_summary TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspections_vessel ON inspections(vessel_id);
CREATE INDEX idx_inspections_type   ON inspections(inspection_type, status);

-- ---------- 4. INSPECTION ITEMS (answers) ------------------------------
-- One row per answered question. Pre-Purchase-only columns are nullable
-- and simply unused for CONDITION inspections.
CREATE TABLE inspection_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ---------- updated_at trigger ----------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vessels_updated     BEFORE UPDATE ON vessels          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inspections_updated BEFORE UPDATE ON inspections      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_items_updated       BEFORE UPDATE ON inspection_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
