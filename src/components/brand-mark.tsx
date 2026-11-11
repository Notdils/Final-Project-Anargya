// [PLACEHOLDER] logo slot next to the wordmark. Replace the span with the graphic design team's SVG
// (e.g. <img src="/brand/logo.svg" width={24} height={24} alt="" />) when it arrives.
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-grid size-6 shrink-0 place-items-center rounded-md border border-dashed border-current text-[10px] font-semibold opacity-80 ${className}`}>
      A
    </span>
  );
}
