"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar } from "lucide-react";

export function RangeSelect({ days }: { days: number }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Date range</span>
      <Calendar size={16} className="pointer-events-none absolute left-3 text-muted" aria-hidden />
      <select
        className="input w-auto py-2 pl-9 pr-8"
        value={days}
        onChange={(e) => {
          const p = new URLSearchParams(sp);
          p.set("days", e.target.value);
          p.delete("page");
          router.push(`${path}?${p}`);
        }}
      >
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
      </select>
    </label>
  );
}
