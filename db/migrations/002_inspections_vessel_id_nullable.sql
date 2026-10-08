-- An inspection only requires a typed Vessel Name + IMO Number; linking to a
-- row in `vessels` is optional. Drop NOT NULL on vessel_id and keep the
-- entered identity on the inspection itself so it isn't lost when unlinked.
ALTER TABLE inspections ALTER COLUMN vessel_id DROP NOT NULL;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS entered_vessel_name TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS entered_imo_number  TEXT;
