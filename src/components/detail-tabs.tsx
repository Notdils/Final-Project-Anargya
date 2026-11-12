"use client";
import { useId, useState } from "react";
import { useT } from "@/i18n/client";

const TABS = ["Specifications", "Overview", "Shipping"] as const;

export function DetailTabs({ specs, overview }: { specs: [string, string][]; overview: string }) {
  const tr = useT();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Specifications");
  const id = useId();
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={tr("Part details")} className="flex gap-5 border-b border-line md:gap-8">
        {TABS.map((t, i) => (
          <button
            key={t}
            role="tab"
            id={`${id}-${i}`}
            aria-selected={tab === t}
            aria-controls={`${id}-panel`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => {
              const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (d) { const k = (i + d + TABS.length) % TABS.length; setTab(TABS[k]); document.getElementById(`${id}-${k}`)?.focus(); }
            }}
            className={`-mb-px border-b-2 py-3 text-sm font-medium ${tab === t ? "border-teal text-teal" : "border-transparent text-muted hover:text-ink"}`}
          >
            {tr(t)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${TABS.indexOf(tab)}`} className="xl:max-w-[720px]">
        {tab === "Specifications" && (
          <dl>
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line py-3 text-sm">
                <dt className="shrink-0 text-muted">{tr(k)}</dt>
                <dd className="whitespace-pre-line text-right font-mono">{tr(v)}</dd>
              </div>
            ))}
          </dl>
        )}
        {tab === "Overview" && <p className="max-w-[70ch] text-[#404040]">{tr(overview)}</p>}
        {tab === "Shipping" && (
          <div className="flex flex-col gap-3 text-[#404040]">
            <p>{tr("[PLACEHOLDER] Shipping regions, carriers, and lead times from Procurement & Logistics.")}</p>
            <p>{tr("Prices are set in USD; other currencies are shown for reference. Payment is charged in IDR through Midtrans at the rate shown at checkout.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
