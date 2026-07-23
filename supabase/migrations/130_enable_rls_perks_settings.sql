-- Enable Row Level Security on perks_settings table
-- This table is safe to be publicly readable since it only contains banner configuration

ALTER TABLE perks_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (needed for /perks page to fetch banner settings)
CREATE POLICY "perks_settings_public_read"
  ON perks_settings FOR SELECT
  USING (true);

-- Allow service role to modify (API routes use supabaseAdmin with service role key)
CREATE POLICY "perks_settings_service_role_all"
  ON perks_settings FOR ALL
  USING (true);

NOTIFY pgrst, 'reload';
