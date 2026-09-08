"use client";

import { useSyncExternalStore } from "react";

function label(ms: number): string {
  if (ms <= 0) return "Kick-off";
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 2) return `in ${d} days`;
  if (h >= 1) return `in ${h}h ${String(m % 60).padStart(2, "0")}m`;
  return `in ${m} min`;
}

/** A shared 30-second clock. Server snapshot is null so server and first client render match. */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) timer = setInterval(() => listeners.forEach((l) => l()), 30_000);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const getNow = () => Math.floor(Date.now() / 30_000) * 30_000;
const getServerNow = () => null;

/** Live "in 3h 12m" until kick-off. */
export function Countdown({ at, className }: { at: number; className?: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  if (now === null) return <span className={className} aria-hidden="true">&nbsp;</span>;
  return <span className={className}>{label(at - now)}</span>;
}
