import { stablefordTotals, type StablefordCard } from "./stableford";

/**
 * Season golf stats from the Stableford cards a crew has saved. A round counts once every hole on
 * the card is in; a win is the top complete score in a session (ties share it).
 */

export type Round = { sessionId: string; title: string; startsAt: number; card: StablefordCard };

export type GolfStats = {
  rounds: number;
  avg: number | null;
  best: { points: number; title: string } | null;
  wins: number;
  /** Points from the last five complete rounds, oldest first. */
  recent: number[];
  handicap: number | null;
};

export function golfStats(rounds: Round[], userId: string): GolfStats {
  const ordered = [...rounds].sort((a, b) => a.startsAt - b.startsAt);
  const mine: { points: number; title: string }[] = [];
  let wins = 0;
  let handicap: number | null = null;
  for (const r of ordered) {
    const complete = stablefordTotals(r.card).filter((t) => t.gross !== null);
    const me = complete.find((t) => t.userId === userId);
    if (r.card.handicaps[userId] !== undefined) handicap = r.card.handicaps[userId];
    if (!me) continue;
    mine.push({ points: me.points, title: r.title });
    const top = Math.max(...complete.map((t) => t.points));
    if (me.points === top) wins++;
  }
  const n = mine.length;
  const best = mine.reduce<{ points: number; title: string } | null>((b, x) => (b === null || x.points > b.points ? x : b), null);
  return {
    rounds: n,
    avg: n ? Math.round((mine.reduce((a, x) => a + x.points, 0) / n) * 10) / 10 : null,
    best,
    wins,
    recent: mine.slice(-5).map((x) => x.points),
    handicap,
  };
}
