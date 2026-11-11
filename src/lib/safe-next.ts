/** Same-site path for redirects after login. Rejects anything a browser could read as another origin. */
export function safeNext(n?: string | null): string | null {
  if (!n || !n.startsWith("/") || n.startsWith("//") || /[\\\s]/.test(n)) return null;
  try {
    const u = new URL(n, "https://x.invalid");
    if (u.origin !== "https://x.invalid" || u.pathname.startsWith("/api")) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}
