"use client";
import { useId, useState } from "react";
import { useT } from "@/i18n/client";

const CAPS = {
  Electrical: [
    ["Tractive System & Controller", "Battery packs, motor controllers, and power electronics for high-voltage drivetrains."],
    ["Electro Programming & Safety", "Low-voltage electronics, safety circuits, data logging, and live telemetry."],
    ["Enclosure & Thermal", "Protective enclosures and cooling for batteries and electrical components."],
  ],
  Mechanical: [
    ["Aerodynamics & Composite", "Wings, diffusers, bodywork, and lightweight composite structures."],
    ["Chassis & Structural", "Chassis design, structural analysis, and driver ergonomics."],
    ["Motor & Drivetrain", "Propulsion, drivetrain, and cooling systems."],
    ["Vehicle Dynamics", "Suspension, steering, and braking."],
  ],
  Operations: [
    ["Finance & Administration", "Budgeting, cash flow, and reporting."],
    ["Procurement & Logistics", "Sourcing, vendor management, and international shipping."],
    ["Partnerships & PR", "Partners, sponsors, and media relations."],
    ["Brand & Digital", "Design, video, and web."],
  ],
} as const;
type Key = keyof typeof CAPS;
const KEYS = Object.keys(CAPS) as Key[];

export function CapabilityTabs() {
  const t = useT();
  const [tab, setTab] = useState<Key>("Electrical");
  const id = useId();
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={t("Disciplines")} className="inline-flex w-fit gap-1 rounded-lg bg-surface-2 p-1">
        {KEYS.map((k, i) => (
          <button
            key={k}
            role="tab"
            id={`${id}-t-${k}`}
            aria-selected={tab === k}
            aria-controls={`${id}-p-${k}`}
            tabIndex={tab === k ? 0 : -1}
            onClick={() => setTab(k)}
            onKeyDown={(e) => {
              const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (d) {
                const next = KEYS[(i + d + KEYS.length) % KEYS.length];
                setTab(next);
                document.getElementById(`${id}-t-${next}`)?.focus();
              }
            }}
            className={`rounded px-3 py-1.5 text-sm font-medium ${tab === k ? "bg-teal text-white" : "text-muted hover:text-ink"}`}
          >
            {t(k)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-p-${tab}`} aria-labelledby={`${id}-t-${tab}`}>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CAPS[tab].map(([h, s]) => (
          <li key={h} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-6">
            <h3 className="font-medium">{t(h)}</h3>
            <p className="text-sm text-muted">{t(s)}</p>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
