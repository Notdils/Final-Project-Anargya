// Anargya mark from the graphic design team (public/brand/logo.webp, 512 × 329, ratio 1.56).
// Drawn as a mask over currentColor, so it follows the text colour: white on the dark home
// header and splash, black on light pages.
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-6 w-[37px] shrink-0 bg-current [mask:url(/brand/logo.webp)_center/contain_no-repeat] ${className}`}
    />
  );
}
