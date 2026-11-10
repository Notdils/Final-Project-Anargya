"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// First-party page-view events for the admin funnel. Anonymous random session id, no cookies,
// no third-party analytics. Admin and API routes are never tracked.
const TRACKED = /^\/($|about$|marketplace(\/[a-z0-9-]+)?$|cart$|checkout$)/;

function sessionId() {
  try {
    let id = sessionStorage.getItem("anargya-sid");
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem("anargya-sid", id);
    }
    return id;
  } catch {
    return null;
  }
}

export function Tracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || !TRACKED.test(path)) return;
    const sid = sessionId();
    if (!sid) return;
    const body = JSON.stringify({ sid, path });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    else fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  }, [path]);
  return null;
}
