-- Migration: get_grant_stats function for efficient per-cycle grant counting
-- Solves the 1000 row limit issue by doing aggregation in PostgreSQL

CREATE OR REPLACE FUNCTION get_grant_stats()
RETURNS TABLE (
  cycle_id UUID,
  status TEXT,
  count BIGINT,
  total_for_cycle BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.cycle_id,
    g.status::TEXT,
    COUNT(*)::BIGINT,
    sub.cnt::BIGINT
  FROM grants g
  JOIN (
    SELECT cycle_id, COUNT(*) as cnt
    FROM grants
    WHERE cycle_id IS NOT NULL
    GROUP BY cycle_id
  ) sub ON sub.cycle_id = g.cycle_id
  GROUP BY g.cycle_id, g.status, sub.cnt
  ORDER BY g.cycle_id, g.status;
END;
$$;

-- Also create a simpler version that just returns per-cycle counts
CREATE OR REPLACE FUNCTION get_grant_counts_by_cycle()
RETURNS TABLE (
  cycle_id UUID,
  total BIGINT,
  submitted BIGINT,
  approved BIGINT,
  not_approved BIGINT,
  payment_pending BIGINT,
  payment_sent BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.cycle_id,
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE g.status = 'submitted')::BIGINT as submitted,
    COUNT(*) FILTER (WHERE g.status = 'approved')::BIGINT as approved,
    COUNT(*) FILTER (WHERE g.status = 'not_approved')::BIGINT as not_approved,
    COUNT(*) FILTER (WHERE g.status = 'payment_pending')::BIGINT as payment_pending,
    COUNT(*) FILTER (WHERE g.status = 'payment_sent')::BIGINT as payment_sent
  FROM grants g
  WHERE g.cycle_id IS NOT NULL
  GROUP BY g.cycle_id
  ORDER BY g.cycle_id;
END;
$$;

NOTIFY pgrst, 'reload';
