-- Migration: 171_allow_users_to_manage_own_deletion_requests.sql
-- Lets members create and cancel their own deletion requests via the self-service flow.
-- Migration 158 set up RLS on deletion_requests with only admin/service-role INSERT and UPDATE
-- policies, which caused POST /api/profile/request-deletion and POST /api/profile/cancel-deletion
-- to fail with RLS violation (42501) for logged-in members. Admin and service-role policies
-- remain untouched; this adds two narrowly-scoped member policies.

CREATE POLICY "Users can insert their own deletion requests"
  ON deletion_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own deletion requests"
  ON deletion_requests FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload';
