-- Multi-tenancy, step 3 of 3 (DB side): organization_id now defaults to the caller's org.
--
-- Replaces migration 004's temporary `DEFAULT <AUK id>` with
--   COALESCE(app_org_id(), <AUK id>)
--  * App (ship_app) inserts: app_org_id() is the session's org, so rows land in the caller's
--    own organization without every INSERT having to name it. With no session context the
--    default is AUK's id, which the tenant_isolation WITH CHECK then rejects (org <> NULL) —
--    fail closed, not a silent write into AUK.
--  * Owner / migration inserts and the previous (pre-multitenancy) deployment have no
--    app.org_id, so they still default to AUK. This is what keeps a rollback to the old
--    deployment working after the cutover.
-- Routes that create users still pass organization_id explicitly (see /api/users).
BEGIN;
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
    EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET DEFAULT COALESCE(app_org_id(), %L::uuid)', t, auk);
  END LOOP;
END $$;
COMMIT;
