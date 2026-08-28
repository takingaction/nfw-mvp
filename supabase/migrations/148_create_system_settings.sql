-- Migration: 148_create_system_settings.sql
-- System Settings table for operational controls and health monitoring

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000002',
  
  -- Shopify Checkout Control
  shopify_checkout_enabled BOOLEAN DEFAULT TRUE,
  
  -- Internal Health Check Results (from our Admin API call)
  shopify_last_health_check TIMESTAMPTZ,
  shopify_health_status TEXT DEFAULT 'unknown',  -- 'healthy', 'unhealthy', 'error'
  shopify_health_message TEXT,
  
  -- External Status (from Shopify Status public API)
  shopify_external_status TEXT,      -- 'operational', 'degraded_performance', 'partial_outage', 'major_outage', 'maintenance', 'unknown'
  shopify_external_message TEXT,
  shopify_external_updated_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default row using single-row pattern
INSERT INTO system_settings (id) VALUES ('00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- RLS: Public can read, only admins can write
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system_settings"
  ON system_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update system_settings"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
