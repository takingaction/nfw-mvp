-- Migration: 204_lock_gift_membership_purchases.sql
-- Migration 063 named these policies "Admin can ..." but gated them on
-- auth.role() = 'authenticated', so ANY logged-in member could read every
-- gift buyer's name/email and UPDATE purchase records.
--
-- All code reads/writes this table with the service-role key (webhook,
-- /gift-membership/success, /api/admin/gift-codes, lib/anonymize.ts), which
-- bypasses RLS. Dropping the policies leaves RLS enabled with no policies:
-- service role only.
-- Rollback: 204_lock_gift_membership_purchases_rollback.sql

DROP POLICY IF EXISTS "Admin can view gift purchases" ON public.gift_membership_purchases;
DROP POLICY IF EXISTS "Admin can update gift purchases" ON public.gift_membership_purchases;

ALTER TABLE public.gift_membership_purchases ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload';
