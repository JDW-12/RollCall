import { cls } from "./ui";

/** Progress ring for spots filled. Pure SVG, theme-aware, no library. */
export function Ring({ value, max, size = 72, stroke = 7, label, sub, tone = "pitch", className }: { value: number; max: number; size?: number; stroke?: number; label?: string; sub?: string; tone?: "pitch" | "card" | "red" | "ink"; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const color = tone === "card" ? "var(--card)" : tone === "red" ? "var(--red)" : tone === "ink" ? "var(--ink)" : "var(--pitch)";
  return (
    <div className={cls("relative inline-flex items-center justify-center shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={`${value} of ${max}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="display font-bold tnum" style={{ fontSize: size * 0.34 }}>
          {label ?? value}
        </span>
        {sub ? <span className="font-mono uppercase tracking-[0.1em] text-ink-3" style={{ fontSize: Math.max(8, size * 0.12) }}>{sub}</span> : null}
      </div>
    </div>
  );
}
