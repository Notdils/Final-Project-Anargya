// Kept out of the "use client" module so the server component gets a plain string.
export const INTRO_KEY = "anargya-intro-seen";

// Runs during HTML parse, before first paint: hides the server-rendered splash on repeat visits
// so it never flashes. Without JS the splash is hidden by the <noscript> rule.
export const PRELOADER_BOOT = `try{if(sessionStorage.getItem("${INTRO_KEY}")==="1")document.documentElement.dataset.intro="seen"}catch(e){}`;
