-- 0029: customer can start the chat over. The customer only sees messages after customer_reset_at;
-- staff still see the whole history, with a marker where the customer started over.
-- Deleting a whole conversation (both sides) is Admin only (permission support.delete; Admin has every
-- permission in has_perm(), so the function does not change).
alter table public.support_threads add column if not exists customer_reset_at timestamptz;
