-- 210: lock down writes to promotional_popups.
--
-- The "Admin can manage popups" policy was FOR ALL TO public USING (true) with
-- no WITH CHECK, so anyone holding the publishable key (it ships in the
-- browser bundle) could insert, edit or delete popups shown site-wide.
-- The admin API routes (app/api/admin/promotional-popups) use the signed-in
-- admin's session, so an is_admin check keeps them working.

DROP POLICY IF EXISTS "Admin can manage popups" ON public.promotional_popups;

CREATE POLICY "Admin can manage popups"
  ON public.promotional_popups
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- "Anyone can view active popups" (SELECT, is_active = true) is unchanged.
