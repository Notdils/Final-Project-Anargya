-- 0020: idempotency key for order creation. Run after 0019. Safe to re-run.
-- The checkout sends one key per Pay press; the same key twice returns the first order instead of a second one.
alter table public.orders add column if not exists idempotency_key text;
create unique index if not exists orders_idempotency on public.orders(user_id, idempotency_key) where idempotency_key is not null;
