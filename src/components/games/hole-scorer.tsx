"use client";

import { useState } from "react";
import { shotsOnHole, stablefordPoints, type Hole, type RoundExtras } from "@/domain/stableford";
import { RESULT_LABEL, holeResult } from "@/domain/golf-highlights";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { cls } from "@/components/ui";
import { saveStableford } from "@/lib/actions/games";

/**
 * Hole-by-hole Stableford entry built for a phone on the course: one row per hole, a stepper for
 * gross, points working themselves out as you go, front and back nine totals. Submits the same
 * fields as the old grid, so the server action is unchanged.
 */
export function HoleScorer({ sessionId, userId, holes, handicap: initialHandicap, strokes: initialStrokes, extras }: { sessionId: string; userId: string; holes: Hole[]; handicap: number | null; strokes: (number | null)[] | null; extras?: RoundExtras | null }) {
  const [handicap, setHandicap] = useState<string>(initialHandicap == null ? "" : String(initialHandicap));
  const [strokes, setStrokes] = useState<(number | null)[]>(() => holes.map((_, i) => initialStrokes?.[i] ?? null));
  const hcp = Math.max(0, Math.min(54, Number(handicap) || 0));
  const n = holes.length;
  const pts = holes.map((h, i) => stablefordPoints(strokes[i], h.par, h.strokeIndex, hcp, n));
  const sum = (arr: number[], from: number, to: number) => arr.slice(from, to).reduce((a, b) => a + b, 0);
  const grossOf = (from: number, to: number) => strokes.slice(from, to).reduce<number>((a, b) => a + (b ?? 0), 0);
  const half = n === 18 ? 9 : n;

  function set(i: number, v: number | null) {
    setStrokes((s) => s.map((x, k) => (k === i ? v : x)));
  }
  function bump(i: number, d: 1 | -1) {
    const cur = strokes[i];
    // First tap lands on par, so a par is one tap and most holes are one or two.
    const next = cur === null ? holes[i].par + (d === -1 ? -1 : 0) : cur + d;
    set(i, Math.max(1, Math.min(15, next)));
  }

  return (
    <ActionForm action={saveStableford} className="px-3 pb-3 gap-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="userId" value={userId} />
      {strokes.map((v, i) => (
        <input key={i} type="hidden" name={`h_${i}`} value={v ?? ""} />
      ))}
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          Playing handicap
          <input name="handicap" type="number" min={0} max={54} inputMode="numeric" value={handicap} onChange={(e) => setHandicap(e.target.value)} className="w-16 display text-xl font-bold tnum text-center px-1" aria-label="Playing handicap" />
        </label>
        <div className="text-right">
          <div className="eyebrow">Points</div>
          <div className="display text-3xl font-extrabold tnum leading-none text-pitch">{sum(pts, 0, n)}</div>
        </div>
      </div>
      <ol className="flex flex-col divide-y divide-line-2 rounded-md border border-line overflow-hidden" aria-label="Holes">
        {holes.map((h, i) => {
          const shots = shotsOnHole(hcp, h.strokeIndex, n);
          const g = strokes[i];
          const p = pts[i];
          return (
            <li key={h.number} className={cls("flex items-center gap-2 px-2 py-1.5 bg-panel-2", i === half && n === 18 && "border-t-2 border-t-line")}>
              <div className="w-8 display text-xl font-bold tnum text-center">{h.number}</div>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-sm font-semibold">
                  Par {h.par} <span className="text-ink-3 font-normal">· SI {h.strokeIndex}</span>
                  {h.yards ? <span className="text-ink-3 font-normal"> · {h.yards} yds</span> : null}
                </div>
                <div className="text-[11px] text-ink-3 font-mono whitespace-nowrap" aria-label={shots ? `${shots} shot${shots > 1 ? "s" : ""} received` : "no shots"}>
                  {shots ? "●".repeat(shots) + " shot" + (shots > 1 ? "s" : "") : "no shot"}
                  {g !== null && g < h.par ? <span className="ml-2 text-pitch font-bold uppercase tracking-wide">{RESULT_LABEL[holeResult(g, h.par)]}</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => bump(i, -1)} className="press w-10 h-10 rounded-md border border-line bg-panel text-lg font-bold" aria-label={`Hole ${h.number}: one fewer`}>
                  −
                </button>
                <input
                  value={g ?? ""}
                  onChange={(e) => {
                    const t = e.target.value.replace(/\D/g, "");
                    set(i, t === "" ? null : Math.max(1, Math.min(15, Number(t))));
                  }}
                  inputMode="numeric"
                  placeholder="–"
                  aria-label={`Hole ${h.number} gross`}
                  className="w-11 h-10 min-h-0 px-0 py-0 text-center display text-xl font-bold tnum"
                />
                <button type="button" onClick={() => bump(i, 1)} className="press w-10 h-10 rounded-md border border-line bg-panel text-lg font-bold" aria-label={`Hole ${h.number}: one more`}>
                  +
                </button>
              </div>
              <div className={cls("w-8 text-right display text-xl font-extrabold tnum", g === null ? "text-ink-3" : p === 0 ? "text-red" : p >= 3 ? "text-pitch" : "text-ink")} aria-label={`Hole ${h.number}: ${p} points`}>
                {g === null ? "·" : p}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Longest drive (yds)
          <input name="longestDrive" type="number" min={0} max={450} inputMode="numeric" defaultValue={extras?.longestDriveYards ?? ""} placeholder="–" className="display text-lg font-bold tnum" aria-label="Longest drive in yards" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Balls lost
          <input name="ballsLost" type="number" min={0} max={60} inputMode="numeric" defaultValue={extras?.ballsLost ?? ""} placeholder="0" className="display text-lg font-bold tnum" aria-label="Balls lost" />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
        <Total label={n === 18 ? "Out" : "Round"} pts={sum(pts, 0, half)} gross={grossOf(0, half)} />
        {n === 18 ? <Total label="In" pts={sum(pts, half, n)} gross={grossOf(half, n)} /> : <div />}
        <Total label="Total" pts={sum(pts, 0, n)} gross={grossOf(0, n)} strong />
      </div>
      {/* Save keeps you on the card mid-round; submit is for the 18th green and takes you to the leaderboard. */}
      <div className="sticky bottom-20 grid grid-cols-[1fr_2fr] gap-2">
        <SubmitButton variant="secondary" pendingText="Saving…" className="shadow-lg">
          Save
        </SubmitButton>
        <SubmitButton name="submit" value="1" pendingText="Submitting…" className="shadow-lg">
          Submit round
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function Total({ label, pts, gross, strong }: { label: string; pts: number; gross: number; strong?: boolean }) {
  return (
    <div className={cls("rounded-md border border-line px-2 py-1.5", strong ? "bg-pitch-soft border-pitch/40" : "bg-panel-2")}>
      <div className="eyebrow">{label}</div>
      <div className={cls("display text-xl font-extrabold tnum leading-none mt-0.5", strong && "text-pitch")}>{pts} pts</div>
      <div className="text-ink-3">{gross ? `${gross} gross` : "–"}</div>
    </div>
  );
}
