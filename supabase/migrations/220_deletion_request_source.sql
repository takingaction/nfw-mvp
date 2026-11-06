-- Migration: 220_deletion_request_source.sql
-- Lets an admin open a deletion request on a member's behalf (e.g. the member
-- emailed support) while keeping the audit trail honest about how it arrived.
--
-- source:        who created the row
--                  member: the member used the self-serve delete button
--                  admin:  an admin entered it for the member
-- requested_via: the channel the member's request came through
-- created_by:    the admin who entered it (null for self-serve)
--
-- requested_at already exists; for admin-entered rows it holds when the member
-- asked, which may be earlier than created_at.
--
-- Existing rows were all self-serve, so the defaults describe them correctly.

ALTER TABLE deletion_requests
  ADD COLUMN source TEXT NOT NULL DEFAULT 'member'
    CHECK (source IN ('member', 'admin')),
  ADD COLUMN requested_via TEXT NOT NULL DEFAULT 'self_serve'
    CHECK (requested_via IN ('self_serve', 'email', 'freshdesk', 'phone', 'other')),
  ADD COLUMN created_by UUID REFERENCES profiles(id);

-- An admin-entered request must say who entered it and can't claim self-serve.
ALTER TABLE deletion_requests
  ADD CONSTRAINT deletion_requests_admin_source_check CHECK (
    source = 'member'
    OR (created_by IS NOT NULL AND requested_via <> 'self_serve')
  );

NOTIFY pgrst, 'reload';
