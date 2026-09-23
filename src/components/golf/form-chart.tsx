/**
 * Form: what a player actually went round in over their last five completed rounds, as flagsticks
 * standing on the par line. Each bar is strokes over par (or under, hanging below the line), so a 9
 * and an 18 sit on the same scale; the latest round's label gives the gross score golfers quote.
 *
 * An emphasis chart: the latest round in the fairway accent with its flag up, earlier rounds in the
 * de-emphasis grey (both validated against each theme's panel). One baseline (par), 4px rounded data
 * ends, a solid hairline for par. Only the latest value is labelled; every bar carries a native
 * tooltip, and a table view sits alongside for screen readers. A single series, so no legend.
 */

import { fmtToPar } from "@/lib/format";

export type FormRound = { sessionId: string; startsAt: number; course: string; gross: number; par: number; stableford: number; holes: number };

const W = 300;
const H = 132;
const PAD = { l: 8, r: 8, t: 24, b: 22 };
const BAR = 18;

/** A bar from the baseline to its value, rounded only at the data end (the top, or the bottom when under par). */
function barPath(x: number, base: number, end: number, w: number, r = 4): string {
  const h = Math.abs(base - end);
  if (h < 0.5) return `M${x} ${base - 1} H${x + w} V${base + 1} H${x} Z`;
  const rr = Math.min(r, h / 2, w / 2);
  const d = end < base ? 1 : -1; // 1 = bar grows up
  return `M${x} ${base} V${end + d * rr} Q${x} ${end} ${x + rr} ${end} H${x + w - rr} Q${x + w} ${end} ${x + w} ${end + d * rr} V${base} Z`;
}

const short = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }).format(new Date(ms));

function describe(r: FormRound): string {
  return `${r.course}, ${short(r.startsAt)}: ${r.gross} (${fmtToPar(r.gross - r.par)}), par ${r.par}${r.holes === 9 ? ", 9 holes" : ""}`;
}

export function FormChart({ rounds }: { rounds: FormRound[] }) {
  if (!rounds.length) return null;
  const diffs = rounds.map((r) => r.gross - r.par);
  // Par sits at the bottom unless someone's gone under it; keep a minimum span so one round isn't a wall.
  const hi = Math.max(10, ...diffs);
  const lo = Math.min(0, ...diffs);
  const k = (H - PAD.b - PAD.t) / (hi - lo);
  const y = (v: number) => PAD.t + (hi - v) * k;
  const base = y(0);
  const slot = (W - PAD.l - PAD.r) / 5;
  // Right-aligned so the latest round always sits in the same place, however many there are.
  const x0 = PAD.l + slot * (5 - rounds.length);
  const last = rounds.length - 1;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={`Score against par, last ${rounds.length} rounds: ${rounds.map(describe).join("; ")}`}>
        <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} style={{ stroke: "var(--gf-grid)", strokeWidth: 1 }} />
        <text x={PAD.l} y={base - 4} className="font-mono" style={{ fill: "var(--ink-3)", fontSize: 8, letterSpacing: 1 }}>
          PAR
        </text>
        {rounds.map((r, i) => {
          const cx = x0 + slot * i + slot / 2;
          const diff = diffs[i];
          const end = y(diff);
          const now = i === last;
          const top = Math.min(end, base);
          return (
            <g key={r.sessionId}>
              <title>{describe(r)}</title>
              {/* Hit area wider than the bar, so the tooltip isn't a pinpoint target. */}
              <rect x={cx - slot / 2} y={PAD.t - 14} width={slot} height={H - PAD.b - PAD.t + 14} fill="transparent" />
              <path d={barPath(cx - BAR / 2, base, end, BAR)} style={{ fill: now ? "var(--gf-bar-now)" : "var(--gf-bar)" }} />
              {now ? (
                <g>
                  {/* The latest round flies the flag: a pole off the top of its bar and a pennant. */}
                  <rect x={cx - 0.6} y={top - 16} width={1.2} height={16} style={{ fill: "var(--ink-2)" }} />
                  <path d={`M${cx + 0.6} ${top - 16} l10 3.4 l-10 3.4 Z`} style={{ fill: "var(--gf-flag)" }} className="gf-flag" />
                  <text x={cx - 6} y={top - 5} textAnchor="end" style={{ fill: "var(--ink)" }}>
                    <tspan className="display" style={{ fontSize: 15, fontWeight: 800 }}>
                      {r.gross}
                    </tspan>
                    <tspan className="font-mono" dx={3} style={{ fill: "var(--ink-2)", fontSize: 9 }}>
                      {fmtToPar(diff)}
                    </tspan>
                  </text>
                </g>
              ) : null}
              <text x={cx} y={H - 7} textAnchor="middle" className="font-mono" style={{ fill: now ? "var(--ink-2)" : "var(--ink-3)", fontSize: 8.5 }}>
                {short(r.startsAt)}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Score by round</caption>
        <thead>
          <tr>
            <th>Round</th>
            <th>Date</th>
            <th>Score</th>
            <th>Par</th>
            <th>To par</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.sessionId}>
              <td>{r.course}</td>
              <td>{short(r.startsAt)}</td>
              <td>{r.gross}</td>
              <td>{r.par}</td>
              <td>{fmtToPar(r.gross - r.par)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
