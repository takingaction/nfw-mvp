-- Rollback for 209_grant_random_draw.sql
DROP TABLE IF EXISTS grant_draws;

ALTER TABLE grants
  DROP COLUMN IF EXISTS ai_criteria,
  DROP COLUMN IF EXISTS eligibility_checks;

ALTER TABLE grant_cycles DROP CONSTRAINT IF EXISTS grant_cycles_selection_method_check;
ALTER TABLE grant_cycles DROP COLUMN IF EXISTS selection_method;

NOTIFY pgrst, 'reload';
