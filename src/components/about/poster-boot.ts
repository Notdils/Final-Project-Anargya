// Kept out of the "use client" module so the server view gets plain strings.
export const POSTER_ID = "poster-hero";

// Runs during HTML parse, right after the section: hides the layers before first paint so the
// motion can start from its first frame. Skipped with reduced motion (the poster just shows).
export const POSTER_BOOT = `(function(){var e=document.getElementById("${POSTER_ID}");if(e&&!matchMedia("(prefers-reduced-motion: reduce)").matches)e.dataset.anim="pre"})()`;
