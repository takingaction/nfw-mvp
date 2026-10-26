-- Rollback for 210 (restores the previous, open policy).
DROP POLICY IF EXISTS "Admin can manage popups" ON public.promotional_popups;
CREATE POLICY "Admin can manage popups" ON public.promotional_popups FOR ALL TO public USING (true);
