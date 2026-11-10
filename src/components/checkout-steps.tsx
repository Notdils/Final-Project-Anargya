import { Check } from "lucide-react";

const STEPS = ["Cart", "Details", "Payment"];

export function CheckoutSteps({ active }: { active: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 pt-2" aria-label="Checkout progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === active ? "step" : undefined}>
          {i > 0 && <span aria-hidden className={`h-px w-6 ${i <= active ? "bg-teal" : "bg-line"}`} />}
          <span
            aria-hidden
            className={`grid h-4 w-4 place-items-center rounded-full ${i < active ? "bg-teal" : i === active ? "border-[1.5px] border-teal" : "border-[1.5px] border-[#d4d4d4]"}`}
          >
            {i < active && <Check size={10} strokeWidth={3} className="text-white" />}
          </span>
          <span className={`text-[13px] ${i === active ? "font-medium" : ""} ${i <= active ? "text-ink" : "text-muted"}`}>
            {s}
            {i < active && <span className="sr-only"> (done)</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
