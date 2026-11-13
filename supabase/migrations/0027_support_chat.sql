-- 0027: customer service chat. A logged-in customer has one conversation (thread) with the team; every
-- staff role can read and reply (permission support.reply) in Admin → Inbox. All reads and writes go
-- through the server with the service role, so RLS is on with no policies (nobody reads directly).

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  customer_email text,
  customer_name text,
  last_message_at timestamptz not null default now(),
  staff_unread boolean not null default false,   -- customer wrote last and no staff has opened it
  customer_unread boolean not null default false, -- staff replied and the customer has not seen it
  created_at timestamptz not null default now()
);
alter table public.support_threads enable row level security;
create index if not exists support_threads_last on public.support_threads (last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender text not null check (sender in ('customer', 'staff')),
  staff_id uuid references auth.users(id) on delete set null,
  staff_name text,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.support_messages enable row level security;
create index if not exists support_messages_thread on public.support_messages (thread_id, created_at);

-- Every staff role can answer customers. Keep in sync with PERMS in src/lib/rbac.ts.
create or replace function public.has_perm(p text) returns boolean
language sql stable as $$
  select case public.staff_role()
    when 'admin' then true
    when 'catalog' then p in ('products.read', 'products.write', 'support.reply')
    when 'ops' then p in ('products.read', 'orders.read', 'orders.fulfil', 'bookings.read', 'bookings.manage', 'shipping.manage', 'support.reply')
    when 'finance' then p in ('overview.read', 'receipts.read', 'orders.read', 'shipping.manage', 'support.reply')
    else false
  end
$$;
