import { stablefordTotals, type StablefordCard } from "./stableford";
import { roundHighlights, type HoleResult } from "./golf-highlights";

/**
 * Season golf stats from the Stableford cards a crew has saved. A round counts once every hole on
 * the card is in; a win is the top complete score in a session (ties share it).
 */

export type Round = { sessionId: string; title: string; startsAt: number; card: StablefordCard };

export type GolfStats = {
  rounds: number;
  avg: number | null;
  best: { points: number; title: string } | null;
  /** Lowest score against par over complete rounds: what a golfer means by their best round. */
  bestScore: { gross: number; par: number; toPar: number; title: string } | null;
  /** Average strokes against par over complete rounds, to one decimal. */
  avgToPar: number | null;
  wins: number;
  /** Points from the last five complete rounds, oldest first. */
  recent: number[];
  handicap: number | null;
  /** Hole results across every card, complete or not: an ace on a nine-hole knock counts. */
  results: Record<HoleResult, number>;
  /** Best single hole of the season. */
  bestHole: { result: HoleResult; hole: number; title: string } | null;
  longestDrive: { yards: number; title: string } | null;
  ballsLost: number;
};

const NO_RESULTS: Record<HoleResult, number> = { holeInOne: 0, albatross: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, worse: 0 };

export function golfStats(rounds: Round[], userId: string): GolfStats {
  const ordered = [...rounds].sort((a, b) => a.startsAt - b.startsAt);
  const mine: { points: number; title: string; gross: number; par: number }[] = [];
  let wins = 0;
  let handicap: number | null = null;
  const results = { ...NO_RESULTS };
  let bestHole: GolfStats["bestHole"] = null;
  let bestToPar = 1;
  let longestDrive: GolfStats["longestDrive"] = null;
  let ballsLost = 0;
  for (const r of ordered) {
    const hl = roundHighlights(r.card).find((p) => p.userId === userId);
    if (hl) {
      for (const k of Object.keys(results) as HoleResult[]) results[k] += hl.counts[k];
      if (hl.best && hl.best.toPar < bestToPar) [bestToPar, bestHole] = [hl.best.toPar, { result: hl.best.result, hole: hl.best.hole, title: r.title }];
      if (hl.longestDriveYards && (!longestDrive || hl.longestDriveYards > longestDrive.yards)) longestDrive = { yards: hl.longestDriveYards, title: r.title };
      ballsLost += hl.ballsLost ?? 0;
    }
    const complete = stablefordTotals(r.card).filter((t) => t.gross !== null);
    const me = complete.find((t) => t.userId === userId);
    if (r.card.handicaps[userId] !== undefined) handicap = r.card.handicaps[userId];
    if (!me) continue;
    mine.push({ points: me.points, title: r.title, gross: me.gross!, par: r.card.holes.reduce((a, h) => a + h.par, 0) });
    const top = Math.max(...complete.map((t) => t.points));
    if (me.points === top) wins++;
  }
  const n = mine.length;
  const best = mine.reduce<{ points: number; title: string } | null>((b, x) => (b === null || x.points > b.points ? { points: x.points, title: x.title } : b), null);
  const bestScore = mine.reduce<GolfStats["bestScore"]>((b, x) => (b === null || x.gross - x.par < b.toPar ? { gross: x.gross, par: x.par, toPar: x.gross - x.par, title: x.title } : b), null);
  return {
    rounds: n,
    avg: n ? Math.round((mine.reduce((a, x) => a + x.points, 0) / n) * 10) / 10 : null,
    best,
    bestScore,
    avgToPar: n ? Math.round((mine.reduce((a, x) => a + x.gross - x.par, 0) / n) * 10) / 10 : null,
    wins,
    recent: mine.slice(-5).map((x) => x.points),
    handicap,
    results,
    bestHole,
    longestDrive,
    ballsLost,
  };
}
