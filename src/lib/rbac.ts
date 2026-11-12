// Role-based access for the admin area. Mirrors public.has_perm() in supabase/migrations/0011.
// The role lives in app_metadata.role, which only the server (service role) can change.

export const STAFF_ROLES = ["admin", "catalog", "ops", "finance"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type Role = StaffRole | "customer";

export type Perm =
  | "overview.read" | "receipts.read" | "orders.read" | "orders.fulfil"
  | "bookings.read" | "bookings.manage" | "products.read" | "products.write" | "users.manage" | "shipping.manage";

const PERMS: Record<StaffRole, Perm[] | "all"> = {
  admin: "all",
  catalog: ["products.read", "products.write"],
  ops: ["products.read", "orders.read", "orders.fulfil", "bookings.read", "bookings.manage", "shipping.manage"],
  finance: ["overview.read", "receipts.read", "orders.read", "shipping.manage"],
};

export const ROLE_INFO: Record<Role, { label: string; desc: string }> = {
  admin: { label: "Admin", desc: "Everything, including users and roles." },
  catalog: { label: "Catalog", desc: "Products: prices, stock, images and 3D models." },
  ops: { label: "Operations", desc: "Orders, shipping rates, consultation bookings. Products read-only." },
  finance: { label: "Finance", desc: "Overview, receipts, exports, shipping rates. Orders read-only." },
  customer: { label: "Customer", desc: "No admin access." },
};

export const toRole = (r: unknown): Role => (STAFF_ROLES as readonly string[]).includes(String(r)) ? (r as StaffRole) : "customer";
export const isStaff = (r: Role | null | undefined) => !!r && r !== "customer";
export function can(role: Role | null | undefined, perm: Perm) {
  if (!role || role === "customer") return false;
  const p = PERMS[role];
  return p === "all" || p.includes(perm);
}

/** Admin sections in menu order, with the permission each one needs. */
export const ADMIN_SECTIONS = [
  { href: "/admin", label: "Overview", perm: "overview.read" },
  { href: "/admin/orders", label: "Orders", perm: "orders.read" },
  { href: "/admin/receipts", label: "Receipts", perm: "receipts.read" },
  { href: "/admin/bookings", label: "Bookings", perm: "bookings.read" },
  { href: "/admin/products", label: "Products", perm: "products.read" },
  { href: "/admin/shipping", label: "Shipping Cost", perm: "shipping.manage" },
  { href: "/admin/users", label: "Users", perm: "users.manage" },
] as const satisfies readonly { href: string; label: string; perm: Perm }[];

const API_PERMS: [RegExp, Perm][] = [
  [/^\/api\/admin\/export/, "receipts.read"],
  [/^\/api\/admin\/orders\/[^/]+\/midtrans$/, "orders.read"], // "Check Midtrans" button on pending orders; same rules as the webhook, so read access is enough
  [/^\/api\/admin\/orders/, "orders.fulfil"],
  [/^\/api\/admin\/bookings/, "bookings.manage"],
  [/^\/api\/admin\/products/, "products.write"],
  [/^\/api\/admin\/users/, "users.manage"],
  [/^\/api\/admin\/shipping/, "shipping.manage"],
];

/** Permission needed for an admin page or admin API path (null = any staff role). */
export function permForPath(path: string): Perm | null {
  for (const [re, p] of API_PERMS) if (re.test(path)) return p;
  const s = [...ADMIN_SECTIONS].sort((a, b) => b.href.length - a.href.length).find((x) => (x.href === "/admin" ? path === "/admin" : path === x.href || path.startsWith(x.href + "/")));
  return s ? s.perm : null;
}

/** First admin page this role may open (where staff land after login). */
export const homeFor = (role: Role) => ADMIN_SECTIONS.find((s) => can(role, s.perm))?.href ?? "/marketplace";
