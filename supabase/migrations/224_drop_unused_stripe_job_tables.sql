-- Migration: 224_drop_unused_stripe_job_tables.sql
--
-- Job queues for Stripe Sync tools removed in ac625a4b ("Generate Stripe
-- Data", "Find Duplicates", "Sync All Payments"). Their routes and crons are
-- gone; nothing reads or writes these tables. No foreign keys, views or
-- functions reference them (checked 2026-11-14).
--
-- Safe to run before or after deploying.

DROP TABLE IF EXISTS public.stripe_only_jobs;
DROP TABLE IF EXISTS public.stripe_duplicates_jobs;
DROP TABLE IF EXISTS public.sync_all_jobs;
