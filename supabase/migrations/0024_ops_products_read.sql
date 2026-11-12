-- 0024: Operations can see the product list (read-only) to check stock while fulfilling orders.
-- Keep in sync with PERMS in src/lib/rbac.ts.
create or replace function public.has_perm(p text) returns boolean
language sql stable as $$
  select case public.staff_role()
    when 'admin' then true
    when 'catalog' then p in ('products.read', 'products.write')
    when 'ops' then p in ('products.read', 'orders.read', 'orders.fulfil', 'bookings.read', 'bookings.manage', 'shipping.manage')
    when 'finance' then p in ('overview.read', 'receipts.read', 'orders.read', 'shipping.manage')
    else false
  end
$$;
