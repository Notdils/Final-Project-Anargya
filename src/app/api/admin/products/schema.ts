import { z } from "zod";
import { CATEGORIES } from "@/lib/data";

export const UNITS = ["set", "kit", "unit", "pair"] as const;
const cat = z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]]);
const text = (max: number) => z.string().trim().max(max).transform((v) => (v === "" ? null : v));

/** Fields an admin may change. Everything is optional so toggles can send one field. */
export const ProductPatch = z
  .object({
    name: z.string().trim().min(3).max(120),
    category: cat,
    priceUsd: z.number().positive().max(1_000_000).multipleOf(0.01),
    unit: z.enum(UNITS),
    stock: z.number().int().min(0).max(100_000),
    active: z.boolean(),
    featured: z.boolean(),
    leadTime: text(80), material: text(120), weight: text(60), dimensions: text(120), fits: text(160), finish: text(120),
    description: text(1000),
  })
  .partial()
  .strict();

export const ProductCreate = z.object({
  name: z.string().trim().min(3).max(120),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,20}$/, "Use letters, numbers and dashes, e.g. AN-AERO-02."),
  category: cat,
  priceUsd: z.number().positive().max(1_000_000),
  unit: z.enum(UNITS),
  stock: z.number().int().min(0).max(100_000),
});

export const toColumns = (p: z.infer<typeof ProductPatch>) => {
  const map: Record<string, string> = { priceUsd: "price_usd", leadTime: "lead_time" };
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [map[k] ?? k, v]));
};
