-- Migration 214: Cookie Policy legal page.
--
-- Adds the row behind /cookie-policy (and /embed/legal/cookie-policy for the
-- app). Paste Termly's Cookie Policy "Embed" snippet into it in Admin -> Legal;
-- the admin save only updates existing rows, so the row must exist first.
--
-- Idempotent.

INSERT INTO legal_pages (slug, title) VALUES
  ('cookie-policy', 'Cookie Policy')
ON CONFLICT (slug) DO NOTHING;
