-- Scoring schema the code already assumed but was never created:
--  * section_scores: read by GET /api/inspections/[id] and /inspections/[id],
--    written by PATCH /api/inspections/[id] (action=calculate_score) with
--    ON CONFLICT (inspection_id, section_code).
--  * inspections.overall_score/condition_score/management_score: written by the
--    same PATCH, read by inspection-manager, reports-list, vessel-history.
-- Scores come from src/lib/grading.ts and are Math.round()ed 0-100 integers.
CREATE TABLE IF NOT EXISTS section_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS overall_score    INTEGER;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS condition_score  INTEGER;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS management_score INTEGER;
