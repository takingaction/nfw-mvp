-- Migration: 043_create_profile_avatars_bucket.sql
-- Description: Create profile-avatars storage bucket for member profile pictures
-- Created: 2026-04-20

-- Create the profile-avatars bucket (private with signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-avatars', 'profile-avatars', false, 2097152, '{"image/jpeg","image/png","image/webp"}')
ON CONFLICT (id) DO NOTHING;

-- IMPORTANT: Notify PostgREST to reload schema cache so it sees the avatar_url column
-- Run this after adding avatar_url column to profiles table
NOTIFY pgrst, 'reload';