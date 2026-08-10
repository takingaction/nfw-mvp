-- Migration: 136_add_gift_code_redeemed_to_profiles.sql
-- Adds gift_code_redeemed boolean to profiles table and backfills from gift_membership_codes

-- 1. Add gift_code_redeemed column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gift_code_redeemed BOOLEAN DEFAULT FALSE;

-- 2. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_gift_code_redeemed ON profiles(gift_code_redeemed) WHERE gift_code_redeemed = TRUE;

-- 3. Backfill: Set gift_code_redeemed = TRUE for profiles where id exists in gift_membership_codes with redeemed_at
UPDATE profiles
SET gift_code_redeemed = TRUE
WHERE id IN (
  SELECT DISTINCT redeemed_by_user_id
  FROM gift_membership_codes
  WHERE redeemed_by_user_id IS NOT NULL
    AND redeemed_at IS NOT NULL
);

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
