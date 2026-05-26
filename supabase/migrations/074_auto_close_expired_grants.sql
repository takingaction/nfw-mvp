-- Migration: Auto-close grant cycles when end_date passes
-- Created: 2026-05-26

-- Create function to automatically close grant cycles
CREATE OR REPLACE FUNCTION auto_close_expired_grant_cycles()
RETURNS TRIGGER AS $$
BEGIN
  -- If the end_date has passed and status is still 'open', set status to 'closed'
  IF OLD.status = 'open' 
    AND NEW.end_date < CURRENT_DATE 
    AND NEW.status = 'open' THEN
    NEW.status := 'closed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on grant_cycles table
DROP TRIGGER IF EXISTS trg_auto_close_expired_grants ON grant_cycles;

CREATE TRIGGER trg_auto_close_expired_grants
  BEFORE UPDATE ON grant_cycles
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_expired_grant_cycles();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';