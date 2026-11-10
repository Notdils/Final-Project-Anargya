"use client";
import { useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES, type Category, type Product } from "@/lib/data";
import { ProductCard } from "./product";

const PER_PAGE = 9;
type Sort = "featured" | "price-asc" | "price-desc" | "name";

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <span className="grid h-4 w-4 place-items-center rounded border border-[#d4d4d4] peer-checked:border-teal peer-checked:bg-teal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-teal">
        {checked && <Check size={12} strokeWidth={3} className="text-white" aria-hidden />}
      </span>
      {label}
    </label>
  );
}

export function MarketplaceGrid({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("featured");
  const [page, setPage] = useState(1);
  const sheet = useRef<HTMLDialogElement>(null);

  const toggle = (c: Category) =>
    setCats((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      setPage(1);
      return n;
    });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const lo = Number(min) || 0, hi = Number(max) || Infinity;
    const list = products.filter(
      (p) =>
        (!term || p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)) &&
        (cats.size === 0 || cats.has(p.category)) &&
        p.priceJpy >= lo && p.priceJpy <= hi &&
        (!inStock || p.stock > 0),
    );
    const s = [...list];
    if (sort === "price-asc") s.sort((a, b) => a.priceJpy - b.priceJpy);
    if (sort === "price-desc") s.sort((a, b) => b.priceJpy - a.priceJpy);
    if (sort === "name") s.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "featured") s.sort((a, b) => Number(b.featured) - Number(a.featured));
    return s;
  }, [products, q, cats, min, max, inStock, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const shown = filtered.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  const clear = () => { setCats(new Set()); setMin(""); setMax(""); setInStock(false); setQ(""); setPage(1); };

  const filters = (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-3">Category</legend>
        {CATEGORIES.map((c) => <Checkbox key={c.id} label={c.label} checked={cats.has(c.id)} onChange={() => toggle(c.id)} />)}
      </fieldset>
      <hr className="border-line" />
      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-3">Price (JPY)</legend>
        <div className="flex gap-2">
          <input className="input" inputMode="numeric" placeholder="Min" aria-label="Minimum price" value={min} onChange={(e) => { setMin(e.target.value.replace(/\D/g, "")); setPage(1); }} />
          <input className="input" inputMode="numeric" placeholder="Max" aria-label="Maximum price" value={max} onChange={(e) => { setMax(e.target.value.replace(/\D/g, "")); setPage(1); }} />
        </div>
      </fieldset>
      <hr className="border-line" />
      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-3">Availability</legend>
        <Checkbox label="In stock only" checked={inStock} onChange={() => { setInStock((v) => !v); setPage(1); }} />
      </fieldset>
      <button type="button" className="btn btn-outline" onClick={clear}>Clear filters</button>
    </div>
  );

  return (
    <div className="mt-6 flex flex-col gap-4 md:mt-8">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search parts</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" type="search" placeholder="Search parts" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </label>
        <button type="button" className="btn btn-outline px-3 xl:hidden" onClick={() => sheet.current?.showModal()}>
          <SlidersHorizontal size={16} aria-hidden />
          <span className="hidden md:inline">Filters</span>
          <span className="sr-only md:hidden">Filters</span>
        </button>
        <label>
          <span className="sr-only">Sort</span>
          <select className="input w-auto pr-8" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0 xl:hidden" role="group" aria-label="Category">
        <button type="button" onClick={() => { setCats(new Set()); setPage(1); }} className={`btn shrink-0 px-3 py-1.5 ${cats.size === 0 ? "bg-teal text-white" : "btn-outline"}`} aria-pressed={cats.size === 0}>All parts</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => toggle(c.id)} aria-pressed={cats.has(c.id)} className={`btn shrink-0 px-3 py-1.5 ${cats.has(c.id) ? "bg-teal text-white" : "btn-outline"}`}>{c.label}</button>
        ))}
      </div>

      <div className="flex gap-8 pt-2">
        <aside aria-label="Filters" className="hidden w-[232px] shrink-0 xl:block">{filters}</aside>
        <div className="flex flex-1 flex-col gap-6">
          <p className="text-sm text-muted" aria-live="polite">{filtered.length} parts</p>
          {shown.length ? (
            <ul className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {shown.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-10 text-center">
              <p className="font-medium">No parts match these filters.</p>
              <button type="button" className="mt-3 text-sm font-medium text-teal" onClick={clear}>Clear filters</button>
            </div>
          )}
          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
              <button type="button" className="btn px-3" disabled={cur === 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={16} aria-hidden /><span className="hidden md:inline">Previous</span></button>
              {Array.from({ length: pages }, (_, k) => k + 1).map((n) => (
                <button key={n} type="button" aria-current={n === cur ? "page" : undefined} onClick={() => setPage(n)} className={`btn px-3 ${n === cur ? "border border-teal text-teal" : ""}`}>{n}</button>
              ))}
              <button type="button" className="btn px-3" disabled={cur === pages} onClick={() => setPage(cur + 1)}><span className="hidden md:inline">Next</span><ChevronRight size={16} aria-hidden /></button>
            </nav>
          )}
        </div>
      </div>

      <dialog ref={sheet} className="m-0 ml-auto h-dvh max-h-none w-[min(360px,90vw)] bg-white p-0 backdrop:bg-black/50" aria-label="Filters">
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <span className="font-medium">Filters</span>
          <button type="button" className="btn btn-outline px-2" aria-label="Close filters" onClick={() => sheet.current?.close()}><X size={16} aria-hidden /></button>
        </div>
        <div className="p-5">{filters}</div>
        <div className="sticky bottom-0 border-t border-line bg-white p-5">
          <button type="button" className="btn btn-outline btn-lg w-full" onClick={() => sheet.current?.close()}>Show {filtered.length} parts</button>
        </div>
      </dialog>
    </div>
  );
}
