-- 0019: remove the first-party page-view log. Visits are tracked by Vercel Analytics now.
-- Run after 0018. Safe to re-run. Deletes the events table and its data (no other table depends on it).
drop function if exists public.funnel_counts(timestamptz, timestamptz);
drop table if exists public.events;
