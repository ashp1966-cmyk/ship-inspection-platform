-- Multi-tenancy: IMO uniqueness is per organization, not global, so a buyer and a seller
-- (two tenants) can each register the same ship. No code used ON CONFLICT (imo_number) or
-- looked a vessel up by imo_number alone, so no call sites needed changing.
BEGIN;
ALTER TABLE vessels DROP CONSTRAINT IF EXISTS vessels_imo_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS vessels_org_imo_key ON vessels (organization_id, imo_number);
COMMIT;
