"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { id: string; qty: number };
type Ctx = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const KEY = "anargya-cart-v1";
const CartCtx = createContext<Ctx | null>(null);
const MAX_QTY = 20;

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(v) ? v.filter((l) => typeof l.id === "string" && Number.isInteger(l.qty) && l.qty > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(read());
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: cart stays in memory */
    }
  }, []);

  const value = useMemo<Ctx>(() => {
    const clamp = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.round(n)));
    return {
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.qty, 0),
      add: (id, qty = 1) => {
        const cur = lines.find((l) => l.id === id);
        persist(cur ? lines.map((l) => (l.id === id ? { ...l, qty: clamp(l.qty + qty) } : l)) : [...lines, { id, qty: clamp(qty) }]);
      },
      setQty: (id, qty) => persist(lines.map((l) => (l.id === id ? { ...l, qty: clamp(qty) } : l))),
      remove: (id) => persist(lines.filter((l) => l.id !== id)),
      clear: () => persist([]),
    };
  }, [lines, ready, persist]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
