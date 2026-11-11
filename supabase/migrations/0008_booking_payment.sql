-- 0008: paid consultation bookings (Midtrans). Run once in Supabase SQL Editor, after 0006/0007.
-- A booking holds its slot while payment is pending; an expired or failed payment cancels it and frees the slot.

alter table public.bookings
  add column if not exists phone text check (phone is null or char_length(phone) <= 20),
  add column if not exists fee_usd numeric(10,2),
  add column if not exists fx_usd_idr numeric(12,2),
  add column if not exists charged_idr bigint,
  add column if not exists pay_status text not null default 'unpaid',
  add column if not exists midtrans_txn_id text,
  add column if not exists pay_method text,
  add column if not exists snap_token text,
  add column if not exists snap_redirect_url text,
  add column if not exists pay_expires_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists needs_review boolean not null default false,
  add column if not exists review_note text;

alter table public.bookings drop constraint if exists bookings_pay_status_check;
alter table public.bookings add constraint bookings_pay_status_check
  check (pay_status in ('unpaid','pending','paid','failed','expired'));

create index if not exists bookings_pay_pending_idx on public.bookings(pay_expires_at) where pay_status = 'pending';
create index if not exists bookings_user_idx on public.bookings(user_id);

-- customers can read their own bookings (status page); writes stay server-side (service role)
drop policy if exists "bookings own read" on public.bookings;
create policy "bookings own read" on public.bookings for select using (user_id = auth.uid());
