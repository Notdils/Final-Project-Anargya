-- 0003: let a buyer resume an unfinished payment, and give pending orders a deadline.
-- Run once in Supabase SQL Editor.

alter table public.orders
  add column if not exists snap_token text,
  add column if not exists snap_redirect_url text,
  add column if not exists pay_expires_at timestamptz;

-- Orders created before this migration used a 24 hour Snap window.
update public.orders
set pay_expires_at = created_at + interval '24 hours'
where pay_expires_at is null;
