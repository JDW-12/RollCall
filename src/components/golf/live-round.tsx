"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { HoleGeo } from "@/domain/course-geo";
import { distance, greenDistances, toYards, type LatLon } from "@/domain/geo";
import { stablefordPoints, type Hole } from "@/domain/stableford";
import { fmtToPar } from "@/lib/format";
import { saveHoleScore } from "@/lib/actions/games";
import { HoleMap } from "./hole-map";
import { FlagEmblem } from "./marks";

type Props = {
  sessionId: string;
  backHref: string;
  courseName: string;
  holes: Hole[];
  strokes: (number | null)[];
  handicap: number;
  geo: HoleGeo[] | null;
  center: LatLon | null;
  mapKey: string | null;
};

type Fix = { at: LatLon; accuracy: number } | null;

/**
 * Play mode: the round hole by hole with GPS. Front, middle and back of the green in yards update as
 * you walk, the satellite map shows the hole, and the score for each hole is saved as you go so the
 * card is done when you walk off the 18th. The page keeps the screen awake while it's open.
 */
export function LiveRound({ sessionId, backHref, courseName, holes, strokes: initial, handicap, geo, center, mapKey }: Props) {
  const [strokes, setStrokes] = useState<(number | null)[]>(() => holes.map((_, i) => initial[i] ?? null));
  const firstOpen = strokes.findIndex((s) => s === null);
  const [idx, setIdx] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [fix, setFix] = useState<Fix>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [target, setTarget] = useState<LatLon | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const hole = holes[idx];
  const hg = useMemo(() => geo?.find((g) => g.number === hole.number) ?? null, [geo, hole.number]);
  const d = fix && hg ? greenDistances(fix.at, hg.green) : null;
  const score = strokes[idx];
  const pts = score === null ? null : stablefordPoints(score, hole.par, hole.strokeIndex, handicap, holes.length);
  const played = strokes.map((s, i) => (s === null ? null : { s, par: holes[i].par })).filter((x): x is { s: number; par: number } => x !== null);
  const toPar = played.reduce((a, x) => a + x.s - x.par, 0);

  // GPS: watch the position while the page is open.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const t = setTimeout(() => setGpsError("This browser can't share your location."), 0);
      return () => clearTimeout(t);
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsError(null);
        setFix({ at: [p.coords.latitude, p.coords.longitude], accuracy: p.coords.accuracy });
      },
      (e) => setGpsError(e.code === e.PERMISSION_DENIED ? "Location is off for this site. Allow it in your browser settings to get distances." : "Looking for GPS…"),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Keep the screen on during play; re-take the lock when the page comes back to the front.
  useEffect(() => {
    type Lock = { release: () => Promise<void> };
    let lock: Lock | null = null;
    const take = async () => {
      try {
        const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<Lock> } }).wakeLock;
        if (wl && document.visibilityState === "visible") lock = await wl.request("screen");
      } catch {
        /* not supported or refused: the phone just sleeps as normal */
      }
    };
    void take();
    const onVis = () => void take();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release().catch(() => {});
    };
  }, []);

  const go = useCallback(
    (to: number) => {
      setTarget(null);
      setSaved(null);
      setIdx(Math.max(0, Math.min(holes.length - 1, to)));
    },
    [holes.length],
  );

  const save = (value: number | null, next = false) => {
    const at = idx;
    setStrokes((s) => s.map((x, i) => (i === at ? value : x)));
    start(async () => {
      const r = await saveHoleScore(sessionId, at, value);
      setSaved(r.error ?? "Saved");
      if (!r.error && next && at < holes.length - 1) go(at + 1);
    });
  };

  const yards = (m: number | null | undefined) => (m === null || m === undefined ? "–" : String(toYards(m)));

  return (
    <div className="golf fixed inset-0 flex flex-col bg-ground text-ink">
      <header className="flex items-center justify-between gap-2 px-3 h-14 border-b border-line bg-ground/90 backdrop-blur-md z-10">
        <Link href={backHref} className="text-sm font-semibold text-ink-2 px-2 py-1 -ml-1 rounded-md hover:bg-ground-2">
          ← Card
        </Link>
        <div className="flex items-center gap-1.5 min-w-0">
          <FlagEmblem size={20} className="shrink-0" />
          <span className="display text-lg font-extrabold uppercase truncate">{courseName}</span>
        </div>
        <span className="font-mono text-xs text-ink-2 tnum shrink-0" aria-label="Score so far">
          {played.length ? `${fmtToPar(toPar)} thru ${played.length}` : "Not started"}
        </span>
      </header>

      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-line z-10 bg-panel">
        <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} className="press w-11 h-11 rounded-md border border-line text-xl disabled:opacity-30" aria-label="Previous hole">
          ‹
        </button>
        <div className="text-center leading-tight">
          <div className="display text-[26px] font-extrabold uppercase">Hole {hole.number}</div>
          <div className="font-mono text-[11px] text-ink-2 tnum">
            Par {hole.par} · SI {hole.strokeIndex}
            {hole.yards ? ` · ${hole.yards} yds` : ""}
          </div>
        </div>
        <button type="button" onClick={() => go(idx + 1)} disabled={idx === holes.length - 1} className="press w-11 h-11 rounded-md border border-line text-xl disabled:opacity-30" aria-label="Next hole">
          ›
        </button>
      </div>

      <div className="relative flex-1 min-h-0 bg-[#1b2a1f]">
        {mapKey ? (
          <HoleMap mapKey={mapKey} hole={hg} center={center} me={fix?.at ?? null} target={target} onTarget={setTarget} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/70">Satellite map isn&apos;t switched on yet. Distances below still work.</div>
        )}
        {/* The numbers that matter, over the map. */}
        <div className="absolute left-2 right-2 top-2 grid grid-cols-3 gap-1.5 pointer-events-none" aria-live="polite">
          {(
            [
              ["Front", d?.front],
              ["Middle", d?.middle],
              ["Back", d?.back],
            ] as const
          ).map(([label, m]) => (
            <div key={label} className="rounded-md bg-black/60 backdrop-blur-sm text-white text-center py-1.5">
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/70">{label}</div>
              <div className={label === "Middle" ? "display text-[34px] font-extrabold leading-none tnum" : "display text-2xl font-bold leading-none tnum"}>{yards(m)}</div>
            </div>
          ))}
        </div>
        {target ? (
          <button type="button" onClick={() => setTarget(null)} className="absolute right-2 bottom-2 rounded-md bg-black/60 text-white text-xs font-semibold px-2.5 py-1.5">
            Clear target
          </button>
        ) : null}
        <div className="absolute left-2 bottom-2 rounded-md bg-black/60 text-white text-[11px] px-2 py-1 max-w-[70%]">
          {gpsError ?? (fix ? `GPS ±${Math.round(fix.accuracy)} m${!hg ? " · this hole isn't mapped, tap the green to measure" : ""}` : "Finding you…")}
          {fix && !hg && target ? ` · ${toYards(distance(fix.at, target))} yds to target` : ""}
        </div>
      </div>

      <footer className="border-t border-line bg-panel px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button type="button" className="press w-12 h-12 rounded-md border border-line text-2xl font-bold" onClick={() => save(Math.max(1, (score ?? hole.par) - 1))} aria-label="One fewer stroke">
              −
            </button>
            <div className="w-14 text-center">
              <div className="display text-[34px] font-extrabold leading-none tnum" aria-label={`Strokes on hole ${hole.number}`}>
                {score ?? "–"}
              </div>
              <div className="font-mono text-[10px] text-ink-3">{pts === null ? "strokes" : `${pts} pts`}</div>
            </div>
            <button type="button" className="press w-12 h-12 rounded-md border border-line text-2xl font-bold" onClick={() => save(Math.min(15, (score ?? hole.par - 1) + 1))} aria-label="One more stroke">
              +
            </button>
          </div>
          <div className="flex-1 flex flex-col items-end gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => (score === null ? save(hole.par, true) : idx < holes.length - 1 ? go(idx + 1) : undefined)}
              className="press min-h-12 px-4 rounded-md bg-pitch text-pitch-ink font-bold disabled:opacity-60"
            >
              {score === null ? `Par ${hole.par}, next` : idx < holes.length - 1 ? "Next hole" : "Last hole done"}
            </button>
            <span className="text-[11px] text-ink-3 h-3.5">{pending ? "Saving…" : saved}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
