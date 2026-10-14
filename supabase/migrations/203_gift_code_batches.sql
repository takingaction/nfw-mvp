-- Migration: 203_gift_code_batches.sql
-- Print-campaign gift codes (mailed cards with a QR code per card).
--
-- 1. gift_code_batches: one row per print run (name, tier, months, expiry).
-- 2. gift_membership_codes can now belong to a purchase OR a batch, and can be voided.
-- 3. create_gift_code_batch(): generates N unique codes atomically (all or nothing),
--    using a CSPRNG and the print-safe alphabet (no 0, O, 1, I).
-- 4. gift_code_status() / redeem_gift_code(): lookup + single-transaction redemption.
--    redeem_gift_code() locks the code row (FOR UPDATE), so two simultaneous
--    redemptions of one code cannot both succeed. The profile upgrade happens in the
--    same transaction, so a code is never marked used without the membership applied
--    (or vice versa).
-- 5. gift_code_lookup_failures: backing table for rate-limiting code guessing.
--
-- All functions are SECURITY DEFINER and executable by service_role only.
-- Rollback: 203_gift_code_batches_rollback.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================================
-- 1. Batches
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gift_code_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'contributing' CHECK (tier IN ('contributing', 'founding')),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20000),
  membership_months INTEGER NOT NULL DEFAULT 12 CHECK (membership_months BETWEEN 1 AND 60),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_gift_code_batches_name UNIQUE (name)
);

ALTER TABLE public.gift_code_batches ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

-- ============================================================================
-- 2. Codes: batch source + void status
-- ============================================================================
ALTER TABLE public.gift_membership_codes
  ALTER COLUMN purchase_id DROP NOT NULL;

ALTER TABLE public.gift_membership_codes
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.gift_code_batches(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_reason TEXT,
  ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_gift_codes_one_source') THEN
    ALTER TABLE public.gift_membership_codes
      ADD CONSTRAINT chk_gift_codes_one_source CHECK (num_nonnulls(purchase_id, batch_id) = 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_gift_codes_not_redeemed_and_voided') THEN
    ALTER TABLE public.gift_membership_codes
      ADD CONSTRAINT chk_gift_codes_not_redeemed_and_voided CHECK (NOT (redeemed_at IS NOT NULL AND voided_at IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gift_codes_batch_id ON public.gift_membership_codes(batch_id) WHERE batch_id IS NOT NULL;

-- Codes are read only through service-role API routes. No migration ever enabled RLS
-- on this table; with RLS off, the public anon key can SELECT every unredeemed code.
-- Enabling with no policies closes that. Idempotent if already enabled.
ALTER TABLE public.gift_membership_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Code generation
-- ============================================================================
-- 32-char alphabet, so (byte & 31) is an unbiased index. 32^8 ≈ 1.1 trillion codes.
CREATE OR REPLACE FUNCTION public.gift_code_random()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, extensions
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b BYTEA := extensions.gen_random_bytes(8);
  result TEXT := '';
BEGIN
  FOR i IN 0..7 LOOP
    result := result || substr(alphabet, (get_byte(b, i) & 31) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_gift_code_batch(
  p_name TEXT,
  p_quantity INTEGER,
  p_tier TEXT DEFAULT 'contributing',
  p_membership_months INTEGER DEFAULT 12,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_batch_id UUID;
  v_remaining INTEGER;
  v_inserted INTEGER;
  v_attempts INTEGER := 0;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Batch name is required';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= NOW() THEN
    RAISE EXCEPTION 'Expiration must be in the future';
  END IF;

  INSERT INTO gift_code_batches (name, tier, quantity, membership_months, expires_at, notes, created_by)
  VALUES (trim(p_name), p_tier, p_quantity, p_membership_months, p_expires_at, NULLIF(trim(p_notes), ''), p_created_by)
  RETURNING id INTO v_batch_id;

  v_remaining := p_quantity;
  -- Set-based insert; collisions with existing codes are skipped and refilled.
  WHILE v_remaining > 0 LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate % unique codes', p_quantity;
    END IF;

    INSERT INTO gift_membership_codes (batch_id, code)
    SELECT v_batch_id, gift_code_random()
    FROM generate_series(1, v_remaining)
    ON CONFLICT (code) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_remaining := v_remaining - v_inserted;
  END LOOP;

  RETURN v_batch_id;
END;
$$;

-- ============================================================================
-- 4. Lookup + redemption
-- ============================================================================
-- Accepts "k7mp-q2xr", "K7MP Q2XR", "K7MPQ2XR". Also matches legacy purchased
-- codes exactly as stored.
CREATE OR REPLACE FUNCTION public.gift_code_status(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_exact TEXT := upper(trim(coalesce(p_code, '')));
  v_clean TEXT := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  r RECORD;
BEGIN
  IF v_clean = '' THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  SELECT c.redeemed_at, c.voided_at,
         COALESCE(b.tier, 'contributing') AS tier,
         COALESCE(b.membership_months, 12) AS membership_months,
         b.expires_at
    INTO r
    FROM gift_membership_codes c
    LEFT JOIN gift_code_batches b ON b.id = c.batch_id
   WHERE c.code IN (v_exact, v_clean)
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  RETURN jsonb_build_object(
    'status', CASE
      WHEN r.voided_at IS NOT NULL THEN 'voided'
      WHEN r.redeemed_at IS NOT NULL THEN 'redeemed'
      WHEN r.expires_at IS NOT NULL AND r.expires_at <= NOW() THEN 'expired'
      ELSE 'valid' END,
    'tier', r.tier,
    'membership_months', r.membership_months,
    'expires_at', r.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_gift_code(
  p_code TEXT,
  p_user_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_exact TEXT := upper(trim(coalesce(p_code, '')));
  v_clean TEXT := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  c RECORD;
  p RECORD;
  v_tier TEXT;
  v_months INTEGER;
  v_ends_at TIMESTAMPTZ;
BEGIN
  IF v_clean = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  -- Row lock: a concurrent redemption of the same code waits here, then sees
  -- redeemed_at set and fails.
  SELECT gc.id, gc.redeemed_at, gc.voided_at, gc.batch_id,
         b.tier, b.membership_months, b.expires_at, b.name AS batch_name
    INTO c
    FROM gift_membership_codes gc
    LEFT JOIN gift_code_batches b ON b.id = gc.batch_id
   WHERE gc.code IN (v_exact, v_clean)
   LIMIT 1
   FOR UPDATE OF gc;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;
  IF c.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'voided');
  END IF;
  IF c.redeemed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'redeemed');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at <= NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  SELECT id, full_name, membership_level, subscription_status, subscription_ends_at,
         first_paid_at, first_paid_level
    INTO p
    FROM profiles
   WHERE id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  -- Already an active paid member: don't consume the code (it stays giftable),
  -- and don't downgrade a Founding member to Contributing.
  IF coalesce(p.membership_level, 'free') <> 'free'
     AND coalesce(p.subscription_status, '') IN ('active', 'trialing', 'past_due', 'canceling')
     AND (p.subscription_ends_at IS NULL OR p.subscription_ends_at > NOW()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_member',
                              'membership_level', p.membership_level);
  END IF;

  v_tier := coalesce(c.tier, 'contributing');
  v_months := coalesce(c.membership_months, 12);
  v_ends_at := NOW() + make_interval(months => v_months);

  UPDATE gift_membership_codes
     SET redeemed_at = NOW(),
         redeemed_by_user_id = p_user_id,
         redeemed_by_email = p_email
   WHERE id = c.id;

  UPDATE profiles
     SET membership_level = v_tier,
         previous_membership_level = coalesce(p.membership_level, 'free'),
         subscription_status = 'active',
         subscription_ends_at = v_ends_at,
         updated_at = NOW(),
         first_paid_at = coalesce(p.first_paid_at, NOW()),
         first_paid_level = coalesce(p.first_paid_level, v_tier),
         gift_code_redeemed = TRUE,
         signup_source = 'gift'
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'membership_level', v_tier,
    'membership_months', v_months,
    'subscription_ends_at', v_ends_at,
    'full_name', p.full_name,
    'batch_name', c.batch_name
  );
END;
$$;

-- ============================================================================
-- 5. Rate-limit backing table (failed lookups by hashed IP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gift_code_lookup_failures (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gift_code_lookup_failures_ip_time
  ON public.gift_code_lookup_failures(ip_hash, created_at DESC);
ALTER TABLE public.gift_code_lookup_failures ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. Per-batch tracker
-- ============================================================================
CREATE OR REPLACE VIEW public.gift_code_batch_stats
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.name,
  b.tier,
  b.quantity,
  b.membership_months,
  b.expires_at,
  b.notes,
  b.created_at,
  b.created_by,
  count(c.id) AS issued,
  count(c.id) FILTER (WHERE c.redeemed_at IS NOT NULL) AS redeemed,
  count(c.id) FILTER (WHERE c.voided_at IS NOT NULL) AS voided,
  count(c.id) FILTER (
    WHERE c.redeemed_at IS NULL AND c.voided_at IS NULL
      AND b.expires_at IS NOT NULL AND b.expires_at <= NOW()
  ) AS expired,
  count(c.id) FILTER (
    WHERE c.redeemed_at IS NULL AND c.voided_at IS NULL
      AND (b.expires_at IS NULL OR b.expires_at > NOW())
  ) AS available,
  max(c.redeemed_at) AS last_redeemed_at
FROM public.gift_code_batches b
LEFT JOIN public.gift_membership_codes c ON c.batch_id = b.id
GROUP BY b.id;

-- ============================================================================
-- 7. Privileges: service role only
-- ============================================================================
REVOKE ALL ON public.gift_code_batch_stats FROM anon, authenticated;
GRANT SELECT ON public.gift_code_batch_stats TO service_role;

REVOKE ALL ON FUNCTION public.gift_code_random() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_gift_code_batch(TEXT, INTEGER, TEXT, INTEGER, TIMESTAMPTZ, TEXT, UUID) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.gift_code_status(TEXT) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_gift_code(TEXT, UUID, TEXT) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.gift_code_random() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_gift_code_batch(TEXT, INTEGER, TEXT, INTEGER, TIMESTAMPTZ, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.gift_code_status(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(TEXT, UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload';
