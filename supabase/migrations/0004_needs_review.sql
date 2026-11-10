-- 0004: flag orders that need a human check (Midtrans reports a different amount than we charged).
-- Run once in Supabase SQL Editor, after 0003.
alter table public.orders
  add column if not exists needs_review boolean not null default false,
  add column if not exists review_note text;

create index if not exists orders_review_idx on public.orders(needs_review) where needs_review;
