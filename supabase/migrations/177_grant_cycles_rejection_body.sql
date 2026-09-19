-- =============================================================================
-- Replace grant_cycles rejection_message / rejection_message_1/2/3 with a single
-- rejection_body JSONB array of {type, text} blocks.
--
-- The new field lets admins compose the rejection email body as a list of
-- paragraphs and bullets via a single editor (RejectionBodyEditor), using
-- the same B/I/Link toolbar the email builder uses. Empty blocks are
-- filtered before render in lib/grant-rejection-body.ts renderRejectionBody,
-- so a {{variable}} block that resolves to empty disappears entirely (the
-- previous 4-field model could not filter this because the filter ran
-- before variable substitution).
-- =============================================================================

-- Add the new JSONB column.
ALTER TABLE grant_cycles
  ADD COLUMN IF NOT EXISTS rejection_body JSONB DEFAULT '[]'::jsonb;

-- One-time backfill: convert the 4 existing fields into a JSONB array,
-- preserving order (opening line as paragraph, then bullets).
UPDATE grant_cycles
SET rejection_body = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object('type', 'paragraph', 'text', rejection_message) AS elem
    WHERE rejection_message IS NOT NULL AND length(trim(rejection_message)) > 0
    UNION ALL
    SELECT jsonb_build_object('type', 'bullet', 'text', rejection_message_1) AS elem
    WHERE rejection_message_1 IS NOT NULL AND length(trim(rejection_message_1)) > 0
    UNION ALL
    SELECT jsonb_build_object('type', 'bullet', 'text', rejection_message_2) AS elem
    WHERE rejection_message_2 IS NOT NULL AND length(trim(rejection_message_2)) > 0
    UNION ALL
    SELECT jsonb_build_object('type', 'bullet', 'text', rejection_message_3) AS elem
    WHERE rejection_message_3 IS NOT NULL AND length(trim(rejection_message_3)) > 0
  ) sub
)
WHERE rejection_body = '[]'::jsonb;

-- Drop the now-redundant columns.
ALTER TABLE grant_cycles
  DROP COLUMN IF EXISTS rejection_message,
  DROP COLUMN IF EXISTS rejection_message_1,
  DROP COLUMN IF EXISTS rejection_message_2,
  DROP COLUMN IF EXISTS rejection_message_3;

COMMENT ON COLUMN grant_cycles.rejection_body IS
  'Array of {type: paragraph|bullet, text: string} blocks composing the rejection email body. Empty blocks filtered before render in lib/grant-rejection-body.ts.';

NOTIFY pgrst, 'reload';
