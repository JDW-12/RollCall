import { stablefordTotals } from "./stableford";
import type { Round } from "./golf-stats";

/**
 * "Posted a round" entries for a golf crew's feed, read straight off the cards: every player who hit
 * Submit, stamped with when they did. Built from the card rather than logged at submit time, so rounds
 * posted before the feed knew about them still show, and a corrected card (a par fixed after the
 * round) reads with the corrected score.
 */

export type PostedRound = {
  sessionId: string;
  userId: string;
  at: number;
  title: string;
  course: string | null;
  /** Strokes over the holes played, against the par of those holes. */
  gross: number;
  par: number;
  holesPlayed: number;
  holes: number;
  stableford: number;
};

export function postedRounds(rounds: Round[]): PostedRound[] {
  const out: PostedRound[] = [];
  for (const r of rounds) {
    const submitted = r.card.submitted ?? {};
    const totals = stablefordTotals(r.card);
    for (const [userId, at] of Object.entries(submitted)) {
      const strokes = r.card.strokes[userId] ?? [];
      const t = totals.find((x) => x.userId === userId);
      if (!t || !t.holesPlayed) continue;
      let gross = 0;
      let par = 0;
      r.card.holes.forEach((h, i) => {
        const s = strokes[i];
        if (s === null || s === undefined) return;
        gross += s;
        par += h.par;
      });
      out.push({ sessionId: r.sessionId, userId, at, title: r.title, course: r.card.course?.name ?? null, gross, par, holesPlayed: t.holesPlayed, holes: r.card.holes.length, stableford: t.points });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}
