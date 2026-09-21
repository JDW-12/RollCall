import type { StablefordCard } from "./stableford";

/**
 * The bits of a round people actually talk about: what you made on your best hole, how many
 * birdies, who hit it furthest, who lost the most balls. All derived from the card, so nothing
 * extra to type except the drive and the balls.
 */

export type HoleResult = "holeInOne" | "albatross" | "eagle" | "birdie" | "par" | "bogey" | "double" | "worse";

export function holeResult(gross: number, par: number): HoleResult {
  if (gross === 1) return "holeInOne";
  const d = gross - par;
  if (d <= -3) return "albatross";
  if (d === -2) return "eagle";
  if (d === -1) return "birdie";
  if (d === 0) return "par";
  if (d === 1) return "bogey";
  if (d === 2) return "double";
  return "worse";
}

export const RESULT_LABEL: Record<HoleResult, string> = { holeInOne: "Hole in one", albatross: "Albatross", eagle: "Eagle", birdie: "Birdie", par: "Par", bogey: "Bogey", double: "Double", worse: "Blob" };

export type PlayerHighlights = {
  userId: string;
  counts: Record<HoleResult, number>;
  /** Best hole relative to par, e.g. { hole: 7, toPar: -2 }. Null until a hole is in. */
  best: { hole: number; toPar: number; result: HoleResult } | null;
  longestDriveYards: number | null;
  ballsLost: number | null;
};

const EMPTY: Record<HoleResult, number> = { holeInOne: 0, albatross: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, worse: 0 };

export function roundHighlights(card: StablefordCard): PlayerHighlights[] {
  const out: PlayerHighlights[] = [];
  for (const [userId, strokes] of Object.entries(card.strokes)) {
    const counts = { ...EMPTY };
    let best: PlayerHighlights["best"] = null;
    card.holes.forEach((h, i) => {
      const g = strokes[i];
      if (g === null || g === undefined) return;
      const r = holeResult(g, h.par);
      counts[r]++;
      const toPar = g === 1 ? Math.min(g - h.par, -2) : g - h.par;
      if (best === null || toPar < best.toPar) best = { hole: h.number, toPar, result: r };
    });
    const ex = card.extras?.[userId];
    out.push({ userId, counts, best, longestDriveYards: ex?.longestDriveYards ?? null, ballsLost: ex?.ballsLost ?? null });
  }
  return out;
}

/** Round awards for the recap: who had the day's best hole, longest drive, most balls lost. */
export type RoundAwards = { bestHole: { userId: string; hole: number; result: HoleResult } | null; longestDrive: { userId: string; yards: number } | null; mostLost: { userId: string; balls: number } | null; birdies: { userId: string; n: number }[] };

export function roundAwards(hl: PlayerHighlights[]): RoundAwards {
  let bestHole: RoundAwards["bestHole"] = null;
  let bestToPar = 0;
  for (const p of hl) if (p.best && p.best.toPar < bestToPar) [bestToPar, bestHole] = [p.best.toPar, { userId: p.userId, hole: p.best.hole, result: p.best.result }];
  const drives = hl.filter((p) => p.longestDriveYards).sort((a, b) => b.longestDriveYards! - a.longestDriveYards!);
  const lost = hl.filter((p) => p.ballsLost).sort((a, b) => b.ballsLost! - a.ballsLost!);
  const birdies = hl.map((p) => ({ userId: p.userId, n: p.counts.birdie + p.counts.eagle + p.counts.albatross + p.counts.holeInOne })).filter((b) => b.n > 0).sort((a, b) => b.n - a.n);
  return {
    bestHole,
    longestDrive: drives[0] ? { userId: drives[0].userId, yards: drives[0].longestDriveYards! } : null,
    mostLost: lost[0] ? { userId: lost[0].userId, balls: lost[0].ballsLost! } : null,
    birdies,
  };
}
