/**
 * Form: Stableford points from a player's last five rounds, as flagsticks on a common baseline.
 *
 * An emphasis chart: the latest round in the fairway accent with its flag up, earlier rounds in the
 * de-emphasis grey (both validated against each theme's panel). One baseline, 4px rounded tops, a solid
 * hairline at 36, the par score for 18 holes, drawn only when every round shown was an 18. Only the
 * latest value is labelled; every bar carries a native tooltip, and a table view sits alongside for
 * screen readers. A single series, so no legend: the title says what it is.
 */

export type FormRound = { sessionId: string; startsAt: number; course: string; stableford: number; holes: number };

const W = 300;
const H = 132;
const PAD = { l: 8, r: 8, t: 22, b: 22 };
const BAR = 18;

function barPath(x: number, top: number, w: number, bottom: number, r = 4): string {
  const rr = Math.min(r, (bottom - top) / 2, w / 2);
  return `M${x} ${bottom} V${top + rr} Q${x} ${top} ${x + rr} ${top} H${x + w - rr} Q${x + w} ${top} ${x + w} ${top + rr} V${bottom} Z`;
}

const short = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }).format(new Date(ms));

export function FormChart({ rounds }: { rounds: FormRound[] }) {
  if (!rounds.length) return null;
  const allEighteen = rounds.every((r) => r.holes === 18);
  const max = Math.max(allEighteen ? 40 : 0, ...rounds.map((r) => r.stableford), 10) + 2;
  const plotW = W - PAD.l - PAD.r;
  const base = H - PAD.b;
  const y = (v: number) => base - (v / max) * (base - PAD.t);
  const slot = plotW / 5;
  // Right-aligned so the latest round always sits in the same place, however many there are.
  const x0 = PAD.l + slot * (5 - rounds.length);
  const last = rounds.length - 1;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={`Stableford points, last ${rounds.length} rounds: ${rounds.map((r) => `${r.course} ${short(r.startsAt)}, ${r.stableford}`).join("; ")}`}>
        {allEighteen ? (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(36)} y2={y(36)} style={{ stroke: "var(--gf-grid)", strokeWidth: 1 }} />
            <text x={PAD.l} y={y(36) - 4} className="font-mono" style={{ fill: "var(--ink-3)", fontSize: 8, letterSpacing: 1 }}>
              PAR 36
            </text>
          </g>
        ) : null}
        <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} style={{ stroke: "var(--gf-grid)", strokeWidth: 1 }} />
        {rounds.map((r, i) => {
          const cx = x0 + slot * i + slot / 2;
          const top = y(r.stableford);
          const now = i === last;
          return (
            <g key={r.sessionId}>
              <title>{`${r.course}, ${short(r.startsAt)}: ${r.stableford} Stableford points${r.holes === 9 ? " (9 holes)" : ""}`}</title>
              {/* Hit area wider than the bar, so the tooltip isn't a pinpoint target. */}
              <rect x={cx - slot / 2} y={PAD.t - 12} width={slot} height={base - PAD.t + 12} fill="transparent" />
              <path d={barPath(cx - BAR / 2, top, BAR, base)} style={{ fill: now ? "var(--gf-bar-now)" : "var(--gf-bar)" }} />
              {now ? (
                <g>
                  {/* The latest round flies the flag: a pole off the top of its bar and a pennant. */}
                  <rect x={cx - 0.6} y={top - 16} width={1.2} height={16} style={{ fill: "var(--ink-2)" }} />
                  <path d={`M${cx + 0.6} ${top - 16} l10 3.4 l-10 3.4 Z`} style={{ fill: "var(--gf-flag)" }} className="gf-flag" />
                  <text x={cx - 6} y={top - 5} textAnchor="end" className="display" style={{ fill: "var(--ink)", fontSize: 15, fontWeight: 800 }}>
                    {r.stableford}
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
        <caption>Stableford points by round</caption>
        <thead>
          <tr>
            <th>Round</th>
            <th>Date</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.sessionId}>
              <td>{r.course}</td>
              <td>{short(r.startsAt)}</td>
              <td>{r.stableford}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
