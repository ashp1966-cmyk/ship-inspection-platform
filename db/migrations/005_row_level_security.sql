-- Multi-tenancy, step 2 of 3: Row Level Security (defense in depth).
--
-- WHY A NEW ROLE: the app currently connects as neondb_owner, which owns every table
-- AND has BYPASSRLS, so RLS policies never apply to it. Policies only bite for a role
-- that is neither owner nor BYPASSRLS, so we create `ship_app`. The password is set
-- out-of-band (ALTER ROLE ship_app PASSWORD ...), never committed. Step 3 switches the
-- app's DATABASE_URL to this role; until then production (neondb_owner) is unaffected.
--
-- Request context comes from two transaction-local settings, set from the JWT claims:
--   app.org_id               uuid of the caller's organization
--   app.is_platform_admin    'true' | 'false'
-- Unset/empty => no org, not admin => zero rows (fails closed).

BEGIN;

CREATE OR REPLACE FUNCTION app_org_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.org_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_is_platform_admin() RETURNS boolean
  LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('app.is_platform_admin', true), '')::boolean, false) $$;

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

-- SECURITY DEFINER hygiene: search_path pinned to `public, pg_temp` above (pg_temp last
-- so a caller can't shadow objects via temp schema); EXECUTE only for ship_app + owner.
REVOKE ALL ON FUNCTION auth_find_user(TEXT, BOOLEAN), auth_set_password(UUID, TEXT) FROM PUBLIC;
-- (EXECUTE is granted to ship_app at the end of this file, after the role exists.)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ship_app') THEN
    CREATE ROLE ship_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- Lets the migration owner run `SET LOCAL ROLE ship_app` (scripts/rls-test.mjs). PG16+ gives
-- a role's creator ADMIN only, without SET, so grant it explicitly. The owner already
-- bypasses RLS, so this adds no privilege.
DO $$ BEGIN
  EXECUTE format('GRANT ship_app TO %I WITH SET TRUE', current_user);
END $$;

GRANT USAGE ON SCHEMA public TO ship_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  vessels, inspections, inspection_items, attachments, random_spares_check_items,
  section_scores, capex_projections, vessel_specific_fields, users,
  password_reset_tokens, organizations TO ship_app;
GRANT SELECT ON template_sections, template_questions TO ship_app;
GRANT EXECUTE ON FUNCTION app_org_id(), app_is_platform_admin(),
  auth_find_user(TEXT, BOOLEAN), auth_set_password(UUID, TEXT) TO ship_app;

COMMIT;
