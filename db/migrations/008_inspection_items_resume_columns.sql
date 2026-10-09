-- Continue/resume support: persist everything the inspection form holds so a saved inspection
-- can be reopened identically.
--  * Pre-Purchase equipment inventory rows carried manufacturer / year of make / specifications /
--    condition in the form, but inspection_items had no columns for them, so they were dropped on save.
--  * Custom (inspector-added) questions were saved as prompt = a random client id, so their text and
--    answer kind were lost. custom_prompt / custom_kind keep them (prompt still holds the id).
ALTER TABLE inspection_items
  ADD COLUMN IF NOT EXISTS equipment_manufacturer   TEXT,
  ADD COLUMN IF NOT EXISTS equipment_year_of_make   TEXT,
  ADD COLUMN IF NOT EXISTS equipment_specifications TEXT,
  ADD COLUMN IF NOT EXISTS equipment_condition      TEXT,
  ADD COLUMN IF NOT EXISTS custom_prompt            TEXT,
  ADD COLUMN IF NOT EXISTS custom_kind              TEXT;
