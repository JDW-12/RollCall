"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up from zero on first paint. Falls back to the plain value with reduced motion. */
export function AnimatedNumber({ value, className, decimals = 0, suffix = "" }: { value: number; className?: string; decimals?: number; suffix?: string }) {
  const [n, setN] = useState(value);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dur = 700;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    // First frame starts from zero; nothing is set synchronously inside the effect.
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className={className}>
      {n.toFixed(decimals)}
      {suffix}
    </span>
  );
}
