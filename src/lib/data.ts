// Catalog types and placeholder catalog.
// Used as the source of truth when Supabase is not configured, and as seed reference
// for supabase/migrations/0002_seed.sql. Every name and number here is a PLACEHOLDER
// until Fundraising / Finance confirm the real catalog.

export type Category = "aero" | "electrical" | "chassis" | "drivetrain" | "suspension";

export type Product = {
  id: string;
  slug: string;
  code: string;
  name: string;
  category: Category;
  priceJpy: number;
  stock: number;
  leadTime: string;
  material: string;
  weight: string;
  dimensions: string;
  fits: string;
  finish: string;
  description: string;
  featured: boolean;
  modelUrl: string | null; // 3D render per part, filled when the part renders are ready
};

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "aero", label: "Aero & Composite" },
  { id: "electrical", label: "Electrical" },
  { id: "chassis", label: "Chassis" },
  { id: "drivetrain", label: "Drivetrain" },
  { id: "suspension", label: "Suspension & Brakes" },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

const PH = "[PLACEHOLDER]";
const base = {
  leadTime: PH,
  material: PH,
  weight: PH,
  dimensions: PH,
  fits: PH,
  finish: PH,
  description: `${PH} Two sentences: what the part does, material, and which vehicles it fits.`,
  modelUrl: null,
};

// Placeholder prices (JPY) only exist so cart and checkout can be demonstrated end to end.
export const PLACEHOLDER_PRODUCTS: Product[] = [
  { id: "p-aero-01", slug: "front-wing", code: "AN-AERO-01", name: `${PH} Front wing`, category: "aero", priceJpy: 10000, stock: 3, featured: true, ...base },
  { id: "p-aero-02", slug: "rear-wing", code: "AN-AERO-02", name: `${PH} Rear wing`, category: "aero", priceJpy: 10000, stock: 12, featured: true, ...base },
  { id: "p-susp-01", slug: "damper-set", code: "AN-SUSP-01", name: `${PH} Damper set`, category: "suspension", priceJpy: 10000, stock: 8, featured: true, ...base },
  { id: "p-susp-02", slug: "brake-rotor", code: "AN-SUSP-02", name: `${PH} Brake rotor`, category: "suspension", priceJpy: 10000, stock: 2, featured: true, ...base },
  { id: "p-elec-01", slug: "battery-enclosure", code: "AN-ELEC-01", name: `${PH} Battery enclosure`, category: "electrical", priceJpy: 10000, stock: 5, featured: true, ...base },
  { id: "p-elec-02", slug: "wiring-harness", code: "AN-ELEC-02", name: `${PH} Wiring harness`, category: "electrical", priceJpy: 10000, stock: 10, featured: false, ...base },
  { id: "p-chas-01", slug: "upright", code: "AN-CHAS-01", name: `${PH} Upright`, category: "chassis", priceJpy: 10000, stock: 6, featured: true, ...base },
  { id: "p-chas-02", slug: "wishbone-set", code: "AN-CHAS-02", name: `${PH} Wishbone set`, category: "chassis", priceJpy: 10000, stock: 1, featured: false, ...base },
  { id: "p-driv-01", slug: "motor-housing", code: "AN-DRIV-01", name: `${PH} Motor housing`, category: "drivetrain", priceJpy: 10000, stock: 4, featured: false, ...base },
  { id: "p-driv-02", slug: "radiator", code: "AN-DRIV-02", name: `${PH} Radiator`, category: "drivetrain", priceJpy: 10000, stock: 9, featured: false, ...base },
];

export const LOW_STOCK = 3;
export const isLowStock = (p: Pick<Product, "stock">) => p.stock > 0 && p.stock <= LOW_STOCK;
