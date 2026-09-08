"use client";

import { useEffect, useState } from "react";

function label(ms: number): string {
  if (ms <= 0) return "Kick-off";
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 2) return `in ${d} days`;
  if (h >= 1) return `in ${h}h ${String(m % 60).padStart(2, "0")}m`;
  return `in ${m} min`;
}

/** Live "in 3h 12m" until kick-off. Renders nothing until mounted so server and client markup match. */
export function Countdown({ at, className }: { at: number; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <span className={className} aria-hidden="true">&nbsp;</span>;
  return <span className={className}>{label(at - now)}</span>;
}
