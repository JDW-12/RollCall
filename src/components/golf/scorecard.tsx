import type { CSSProperties } from "react";
import { holeResult, type HoleResult } from "@/domain/golf-highlights";
import { stablefordPoints, type Hole } from "@/domain/stableford";
import { cls } from "@/components/ui";
import { fmtToPar } from "@/lib/format";
import { FlagEmblem, TeeMarker } from "./marks";

/**
 * The latest round drawn as a paper scorecard, marked up the way golfers mark theirs: a circle round a
 * birdie, two for an eagle, a box round a bogey, two for a double or worse. The shape carries the
 * meaning, so the card reads in greyscale and to colour-blind eyes; colour (red under, blue over, both
 * validated against the paper) is the second channel. Numbers stay in ink, never in the mark colour.
 */

type Mark = "eagle" | "birdie" | "par" | "bogey" | "double" | "none";

function markOf(r: HoleResult | null): Mark {
  if (!r) return "none";
  if (r === "holeInOne" || r === "albatross" || r === "eagle") return "eagle";
  if (r === "birdie") return "birdie";
  if (r === "par") return "par";
  if (r === "bogey") return "bogey";
  return "double";
}

const MARK_STYLE: Record<Mark, CSSProperties> = {
  eagle: { border: "1.5px solid var(--gf-under)", borderRadius: 999, outline: "1.5px solid var(--gf-under)", outlineOffset: 1.5 },
  birdie: { border: "1.5px solid var(--gf-under)", borderRadius: 999 },
  par: {},
  bogey: { border: "1.5px solid var(--gf-over)", borderRadius: 2 },
  double: { border: "1.5px solid var(--gf-over)", borderRadius: 2, outline: "1.5px solid var(--gf-over)", outlineOffset: 1.5 },
  none: {},
};

const MARK_LABEL: Record<Mark, string> = { eagle: "eagle or better", birdie: "birdie", par: "par", bogey: "bogey", double: "double bogey or worse", none: "not played" };

export type ScorecardProps = {
  course: string;
  tee: string;
  date: string;
  holes: Hole[];
  strokes: (number | null)[];
  handicap: number;
  stableford: number;
  votePoints: number;
  total: number;
  place: number;
  field: number;
};

export function Scorecard(p: ScorecardProps) {
  const n = p.holes.length;
  const pts = p.holes.map((h, i) => (p.strokes[i] === null ? null : stablefordPoints(p.strokes[i], h.par, h.strokeIndex, p.handicap, n)));
  const blocks = n === 18 ? [{ label: "Out", from: 0, to: 9 }, { label: "In", from: 9, to: 18 }] : [{ label: "Tot", from: 0, to: n }];
  const used = new Set<Mark>(p.holes.map((h, i) => markOf(p.strokes[i] === null ? null : holeResult(p.strokes[i]!, h.par))).filter((m) => m !== "par" && m !== "none"));
  const played = p.strokes.filter((x) => x !== null).length;
  // The total a golfer quotes: strokes against the par of the holes they played, so a card left
  // unfinished reads "thru 12, +6" rather than a flattering number against the full par.
  const gross = p.strokes.reduce<number>((a, x) => a + (x ?? 0), 0);
  const parPlayed = p.holes.reduce((a, h, i) => a + (p.strokes[i] === null ? 0 : h.par), 0);

  return (
    <article className="rounded-md overflow-hidden shadow-[var(--shadow)] ring-1 ring-black/20" style={{ background: "var(--gf-paper)", color: "var(--gf-paper-ink)" }} aria-label={`Scorecard, ${p.course}`}>
      <header className="flex items-center justify-between gap-3 px-3 py-2.5" style={{ background: "linear-gradient(180deg, #2b7a44, #1f6437)", color: "#f6f3ea" }}>
        <div className="flex items-center gap-2 min-w-0">
          <FlagEmblem size={26} className="shrink-0 drop-shadow" />
          <div className="min-w-0 leading-tight">
            <div className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-80">Scorecard · {p.date}</div>
            <div className="display text-xl font-extrabold uppercase truncate">{p.course}</div>
          </div>
        </div>
        <div className="text-right shrink-0 leading-tight">
          {p.tee ? (
            <div className="flex items-center justify-end gap-1.5 text-xs font-semibold">
              <TeeMarker tee={p.tee} size={11} /> {p.tee} tees
            </div>
          ) : null}
          <div className="font-mono text-[10px] opacity-80">Playing hcp {p.handicap}</div>
        </div>
      </header>

      <div className="px-2 pt-2 pb-1 flex flex-col gap-2">
        {blocks.map((b) => {
          const holes = p.holes.slice(b.from, b.to);
          const gross = p.strokes.slice(b.from, b.to).reduce<number>((a, x) => a + (x ?? 0), 0);
          const points = pts.slice(b.from, b.to).reduce<number>((a, x) => a + (x ?? 0), 0);
          const par = holes.reduce((a, h) => a + h.par, 0);
          const cols = { gridTemplateColumns: `3rem repeat(${holes.length}, minmax(0, 1fr)) 2.5rem` };
          const cell = "h-7 flex items-center justify-center font-mono text-[11px] tabular-nums";
          return (
            <div key={b.label} className="rounded-sm overflow-hidden" style={{ border: "1px solid var(--gf-paper-line)" }} role="table" aria-label={`${b.label === "In" ? "Back" : "Front"} nine`}>
              <div className="grid" style={{ ...cols, background: "var(--gf-paper-2)" }} role="row">
                <span className={cls(cell, "justify-start pl-1.5 text-[9px] tracking-[0.14em] uppercase font-semibold")} style={{ color: "var(--gf-paper-ink-2)" }} role="rowheader">Hole</span>
                {holes.map((h) => (
                  <span key={h.number} className={cls(cell, "font-semibold")} role="columnheader">{h.number}</span>
                ))}
                <span className={cls(cell, "text-[9px] tracking-[0.14em] uppercase font-semibold")} role="columnheader">{b.label}</span>
              </div>
              <div className="grid" style={{ ...cols, borderTop: "1px solid var(--gf-paper-line)" }} role="row">
                <span className={cls(cell, "justify-start pl-1.5 text-[9px] tracking-[0.14em] uppercase")} style={{ color: "var(--gf-paper-ink-2)" }} role="rowheader">Par</span>
                {holes.map((h) => (
                  <span key={h.number} className={cell} style={{ color: "var(--gf-paper-ink-2)" }} role="cell">{h.par}</span>
                ))}
                <span className={cell} style={{ color: "var(--gf-paper-ink-2)" }} role="cell">{par}</span>
              </div>
              <div className="grid" style={{ ...cols, borderTop: "1px solid var(--gf-paper-line)" }} role="row">
                <span className={cls(cell, "h-9 justify-start pl-1.5 text-[9px] tracking-[0.14em] uppercase font-semibold")} role="rowheader">Score</span>
                {holes.map((h, k) => {
                  const g = p.strokes[b.from + k];
                  const m = markOf(g === null ? null : holeResult(g, h.par));
                  return (
                    <span key={h.number} className={cls(cell, "h-9")} role="cell" aria-label={g === null ? `Hole ${h.number}: not played` : `Hole ${h.number}: ${g}, ${MARK_LABEL[m]}`}>
                      <span className="w-[22px] h-[22px] inline-flex items-center justify-center text-[13px] font-bold" style={MARK_STYLE[m]}>
                        {g ?? <span style={{ color: "var(--gf-paper-line)" }}>·</span>}
                      </span>
                    </span>
                  );
                })}
                <span className={cls(cell, "h-9 text-[13px] font-bold")} role="cell">{gross || "–"}</span>
              </div>
              <div className="grid" style={{ ...cols, borderTop: "1px solid var(--gf-paper-line)", background: "color-mix(in oklab, var(--gf-paper-2) 60%, transparent)" }} role="row">
                <span className={cls(cell, "justify-start pl-1.5 text-[9px] tracking-[0.14em] uppercase")} style={{ color: "var(--gf-paper-ink-2)" }} role="rowheader">Pts</span>
                {holes.map((h, k) => (
                  <span key={h.number} className={cls(cell, pts[b.from + k] === 0 && "opacity-50")} role="cell">{pts[b.from + k] ?? ""}</span>
                ))}
                <span className={cls(cell, "font-bold")} role="cell">{points}</span>
              </div>
            </div>
          );
        })}

        {played ? (
          <div className="flex items-center justify-between gap-3 rounded-sm px-3 py-2" style={{ border: "1px solid var(--gf-paper-line)", background: "var(--gf-paper-2)" }} aria-label={`Total: ${gross} strokes, ${fmtToPar(gross - parPlayed)}${played < n ? `, thru ${played}` : ""}`}>
            <div className="leading-tight">
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: "var(--gf-paper-ink-2)" }}>
                Total{played < n ? ` · thru ${played}` : ""}
              </div>
              <div className="text-sm mt-0.5">
                <strong className="tabular-nums">{gross}</strong> <span style={{ color: "var(--gf-paper-ink-2)" }}>strokes · par {parPlayed}</span>
              </div>
            </div>
            <div className="display text-[40px] font-extrabold leading-none tabular-nums">{fmtToPar(gross - parPlayed)}</div>
          </div>
        ) : null}

        {/* A key for the marks: identity is never shape-or-colour alone without saying what it means. */}
        {used.size ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 px-0.5 text-[10px]" style={{ color: "var(--gf-paper-ink-2)" }} aria-label="Key">
            {(["eagle", "birdie", "bogey", "double"] as Mark[])
              .filter((m) => used.has(m))
              .map((m) => (
                <li key={m} className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 inline-block" style={{ ...MARK_STYLE[m], outlineOffset: 1 }} aria-hidden="true" />
                  {MARK_LABEL[m][0].toUpperCase() + MARK_LABEL[m].slice(1)}
                </li>
              ))}
          </ul>
        ) : null}
      </div>

      <footer className="mt-1 flex items-end justify-between gap-3 px-3 py-2.5" style={{ borderTop: "1px dashed var(--gf-paper-line)" }}>
        <div className="text-xs leading-snug" style={{ color: "var(--gf-paper-ink-2)" }}>
          <div>
            <strong style={{ color: "var(--gf-paper-ink)" }}>{p.stableford}</strong> Stableford
            {played < n ? ` (${played} of ${n} holes)` : ""} + <strong style={{ color: "var(--gf-paper-ink)" }}>{p.votePoints}</strong> from votes
          </div>
          <div className="font-semibold mt-0.5" style={{ color: "var(--gf-paper-ink)" }}>
            {p.place === 1 && p.field > 1 ? "Won the round" : `Finished ${ordinal(p.place)} of ${p.field}`}
          </div>
        </div>
        <div className="text-right leading-none">
          <div className="display text-[52px] font-extrabold leading-[0.8]" style={{ color: "#1f6437" }}>
            {p.total}
          </div>
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase mt-1" style={{ color: "var(--gf-paper-ink-2)" }}>
            points
          </div>
        </div>
      </footer>
    </article>
  );
}

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}
