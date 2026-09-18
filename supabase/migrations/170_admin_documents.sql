-- Migration 170: Admin document library + admin-attached grant documents
--
-- 1. Public storage bucket `admin-documents` for the admin link library
--    (files here are meant to be hyperlinked from pages/emails, so public is intended).
-- 2. `admin_documents` tracking table (source of truth for the library list).
-- 3. `grant_documents.uploaded_by` so admin-attached supporting docs are auditable
--    and can be labelled "Added by admin" (NULL = uploaded by the member).

-- 1. Bucket -----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admin-documents',
  'admin-documents',
  true,
  26214400, -- 25 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Tracking table ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_documents_created_at
  ON admin_documents(created_at DESC);

ALTER TABLE admin_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage admin_documents" ON admin_documents;
CREATE POLICY "Admins manage admin_documents"
  ON admin_documents FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3. grant_documents audit column ------------------------------------------
ALTER TABLE grant_documents
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN grant_documents.uploaded_by IS
  'Admin who attached this document on the member''s behalf. NULL = uploaded by the member.';

NOTIFY pgrst, 'reload';
