-- Multi-tenancy, step 1 of 3: organizations + organization_id backfill.
-- AUK is both a tenant (owns all existing data) and the platform administrator.
-- RLS (step 2) and JWT claims / app enforcement (step 3) come in later migrations/commits.
--
-- TEMPORARY: organization_id gets DEFAULT = AUK's id so the currently-deployed app
-- (which doesn't know about organizations yet) keeps inserting successfully. Step 3
-- drops these defaults once every insert path supplies organization_id explicitly.
-- password_reset_tokens is deliberately NOT tenant-scoped: it is keyed to users and
-- is read by the unauthenticated reset flow, which has no org context.
BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO organizations (name) VALUES ('AUK') ON CONFLICT (name) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

DO $$
DECLARE
  auk UUID := (SELECT id FROM organizations WHERE name = 'AUK');
  t   TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vessels','inspections','inspection_items','attachments',
    'random_spares_check_items','section_scores','capex_projections',
    'vessel_specific_fields','users'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)', t);
    EXECUTE format('UPDATE %I SET organization_id = %L WHERE organization_id IS NULL', t, auk);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET DEFAULT %L', t, auk);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(organization_id)', 'idx_' || t || '_org', t);
  END LOOP;
END $$;

COMMIT;
