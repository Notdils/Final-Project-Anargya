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
  priceUsd: number;
  unit: string;
  image: string | null;
  stock: number;
  leadTime: string;
  material: string;
  weight: string;
  dimensions: string;
  fits: string;
  finish: string;
  description: string;
  overview: string; // long text for the Overview tab
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
  overview: PH,
  modelUrl: null,
  image: null,
};

// Fallback catalog (same as supabase/migrations/0005_usd_catalog.sql), used when Supabase is not configured.
// Selling prices in USD from Finance's preliminary sheet.
// PREVIEW mapping of the 4 delivered models (public/models/parts) to the 4 cards. The files contain a
// diffuser, front wing + nose, VCU/BMS and rear wing, so the uprights and pedal box cards show aero parts
// for now. Change it here and in supabase/migrations/0007_part_models.sql.
const MODELS: Record<string, string> = {
  // uprights-wheel-hub-kit: no 3D model yet (wheel hub file pending), shows the render image
  "custom-aero-package": "/models/parts/aero-package.glb", // front wing + rear wing + diffuser in car position
  "custom-vcu-bms-unit": "/models/parts/vcu-bms.glb",
  "brake-pedal-box": "/models/parts/pedal-box.glb",
};
// Specs from the team (11 Nov). Same values as supabase/migrations/0012_product_specs.sql.
const SPECS: Record<string, Pick<Product, "material" | "weight" | "fits" | "leadTime">> = {
  "p-upright-kit": { material: "Aluminium, high-tensile alloy steel", weight: "4–4.5 kg per set", fits: 'Formula Student 10" or 13" wheels (PCD 4×98 / 4×100)', leadTime: "3–4 weeks" },
  "p-aero-package": { material: "Carbon fiber, aluminium", weight: "9–11 kg total", fits: "FSAE-standard tubular spaceframe or monocoque chassis", leadTime: "4–5 weeks" },
  "p-vcu-bms": { material: "Aluminium", weight: "1.2–1.8 kg total", fits: "EV powertrains, configured to your team's communication protocol", leadTime: "3–4 weeks" },
  "p-pedal-box": { material: "Aluminium", weight: "2.8–3.4 kg", fits: "Hydraulic braking systems", leadTime: "2–3 weeks" },
};
// Overview text from the team (11 Nov). Same as supabase/migrations/0015_product_overview.sql.
const OVERVIEW: Record<string, string> = {
  "p-upright-kit": "The Uprights & Wheel Hub Assembly Kit serves as the critical structural interface between the vehicle’s suspension geometry, braking system, and wheels. Engineered to withstand high cornering loads, braking torque, and dynamic road inputs, this assembly delivers exceptional structural rigidity while minimizing unsprung mass to optimize suspension response and tire contact patch consistency.",
  "p-aero-package": "The Custom Aerodynamics Package, comprising a multi-element front wing, high-downforce rear wing, and targeted underbody diffuser, is designed using Computational Fluid Dynamics (CFD) to maximize downforce and cornering speeds without introducing excessive aerodynamic drag. It enhances overall vehicle stability during high-speed maneuvering and heavy braking transitions.",
  "p-vcu-bms": "Integrates the central Vehicle Control Unit (VCU) and Master Battery Management System (BMS) into a single, highly reliable electronic module. Acting as the electronic brain of the EV powertrain, it manages throttle mapping, regenerative braking strategies, real-time telemetry output, and high-voltage safety monitoring (cell voltage, temperature balancing, and fault protection) compliant with strict EV safety regulations.",
  "p-pedal-box": "The Custom Brake Pedal Box is an ergonomically optimized driver-interface assembly engineered for crisp pedal feel and precise brake bias tuning. Designed specifically for tight cockpit packaging in Formula-style race cars, it features high leverage ratios and dual master cylinders with a balance bar mechanism to allow on-the-fly front-to-rear braking force adjustments.",
};
const part = (p: Pick<Product, "id" | "slug" | "code" | "name" | "category" | "priceUsd" | "unit" | "stock" | "description">): Product => ({
  ...base, ...p, ...SPECS[p.id], overview: OVERVIEW[p.id] ?? p.description, featured: true, image: `/parts/${p.slug}.webp`, modelUrl: MODELS[p.slug] ?? null,
});
export const PLACEHOLDER_PRODUCTS: Product[] = [
  part({ id: "p-upright-kit", slug: "uprights-wheel-hub-kit", code: "AN-SUSP-01", name: "Uprights & Wheel Hub Assembly Kit", category: "suspension", priceUsd: 2880, unit: "set", stock: 8,
    description: "Upright, wheel hub, bearing and brake caliper mounts as one matched corner assembly for a formula EV." }),
  part({ id: "p-aero-package", slug: "custom-aero-package", code: "AN-AERO-01", name: "Custom Aero Package (Wings & Diffuser)", category: "aero", priceUsd: 3600, unit: "kit", stock: 5,
    description: "Front wing, rear wing and diffuser designed together and tuned to the car's downforce and balance targets." }),
  part({ id: "p-vcu-bms", slug: "custom-vcu-bms-unit", code: "AN-ELEC-01", name: "Custom VCU & BMS Unit (EV)", category: "electrical", priceUsd: 960, unit: "unit", stock: 12,
    description: "Vehicle control unit and battery management system in one enclosure, configured for your pack and motor controller." }),
  part({ id: "p-pedal-box", slug: "brake-pedal-box", code: "AN-CHAS-01", name: "Custom Brake Pedal Box & Master Cylinder", category: "chassis", priceUsd: 1440, unit: "set", stock: 6,
    description: "Adjustable pedal box with throttle and brake pedals and dual master cylinders, sized to your driver and chassis." }),
];

export const LOW_STOCK = 3;
export const isLowStock = (p: Pick<Product, "stock">) => p.stock > 0 && p.stock <= LOW_STOCK;
