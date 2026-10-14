-- Rollback for 204_lock_gift_membership_purchases.sql
-- Restores the (over-permissive) policies from migration 063.

CREATE POLICY "Admin can view gift purchases"
  ON public.gift_membership_purchases FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can update gift purchases"
  ON public.gift_membership_purchases FOR UPDATE
  USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload';
