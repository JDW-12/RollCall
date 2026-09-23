import type { RatingCategory } from "./sports";
import { stablefordTotals } from "./stableford";
import type { Round } from "./golf-stats";

/**
 * The golf leaderboard. Turning up is the whole point for a five-a-side crew, but a golf society
 * judges the round, so golf has its own table: a player's points are the Stableford points on their
 * card plus whatever the crew voted them. Nothing for showing up, nothing off for dropping out.
 */

export type GolfVote = { sessionId: string; category: string; rateeId: string };

export type GolfRoundRow = {
  userId: string;
  /** Stableford points on the holes entered so far. */
  stableford: number;
  holesPlayed: number;
  /** Points from the crew's votes this round. */
  votePoints: number;
  /** Votes by category key. */
  votes: Record<string, number>;
  total: number;
};

export type GolfRoundSummary = {
  sessionId: string;
  title: string;
  startsAt: number;
  course: string | null;
  holes: number;
  /** Best total first. */
  rows: GolfRoundRow[];
};

export type GolfTableRow = {
  userId: string;
  rounds: number;
  stableford: number;
  votePoints: number;
  points: number;
  /** Average Stableford per round played. */
  avg: number | null;
  best: number | null;
  /** The player's most recent round. */
  last: { sessionId: string; title: string; total: number; stableford: number } | null;
  /** Totals from the last five rounds, oldest first. */
  recent: number[];
};

/** One round, scored. A player is in it if they put a card in or the crew voted for them. */
export function golfRoundSummary(round: Round, votes: GolfVote[], categories: RatingCategory[]): GolfRoundSummary {
  const totals = stablefordTotals(round.card).filter((t) => t.holesPlayed > 0);
  const mine = votes.filter((v) => v.sessionId === round.sessionId);
  const ids = new Set<string>([...totals.map((t) => t.userId), ...mine.map((v) => v.rateeId)]);
  const rows: GolfRoundRow[] = [...ids].map((userId) => {
    const t = totals.find((x) => x.userId === userId);
    const counts: Record<string, number> = {};
    for (const v of mine) if (v.rateeId === userId) counts[v.category] = (counts[v.category] ?? 0) + 1;
    const votePoints = categories.reduce((sum, c) => sum + (counts[c.key] ?? 0) * c.points, 0);
    const stableford = t?.points ?? 0;
    return { userId, stableford, holesPlayed: t?.holesPlayed ?? 0, votePoints, votes: counts, total: stableford + votePoints };
  });
  rows.sort((a, b) => b.total - a.total || b.stableford - a.stableford || a.userId.localeCompare(b.userId));
  return { sessionId: round.sessionId, title: round.title, startsAt: round.startsAt, course: round.card.course?.name ?? null, holes: round.card.holes.length, rows };
}

/** The season: every round's points added up, best first. */
export function golfTable(memberIds: string[], rounds: Round[], votes: GolfVote[], categories: RatingCategory[]): GolfTableRow[] {
  const ordered = [...rounds].sort((a, b) => a.startsAt - b.startsAt);
  const summaries = ordered.map((r) => golfRoundSummary(r, votes, categories));
  const rows = memberIds.map<GolfTableRow>((userId) => {
    const played = summaries.flatMap((s) => {
      const row = s.rows.find((r) => r.userId === userId);
      return row ? [{ s, row }] : [];
    });
    const withCard = played.filter((p) => p.row.holesPlayed > 0);
    const stableford = played.reduce((a, p) => a + p.row.stableford, 0);
    const votePoints = played.reduce((a, p) => a + p.row.votePoints, 0);
    const last = played.at(-1);
    return {
      userId,
      rounds: withCard.length,
      stableford,
      votePoints,
      points: stableford + votePoints,
      avg: withCard.length ? Math.round((withCard.reduce((a, p) => a + p.row.stableford, 0) / withCard.length) * 10) / 10 : null,
      best: withCard.length ? Math.max(...withCard.map((p) => p.row.stableford)) : null,
      last: last ? { sessionId: last.s.sessionId, title: last.s.title, total: last.row.total, stableford: last.row.stableford } : null,
      recent: played.slice(-5).map((p) => p.row.total),
    };
  });
  return rows.sort((a, b) => b.points - a.points || (b.avg ?? 0) - (a.avg ?? 0) || (b.best ?? 0) - (a.best ?? 0) || a.userId.localeCompare(b.userId));
}

/** The round to show at the top of the leaderboard: the one asked for, else the most recent with a card in. */
export function currentRound(rounds: Round[], wanted?: string | null): Round | null {
  if (wanted) {
    const hit = rounds.find((r) => r.sessionId === wanted);
    if (hit) return hit;
  }
  const scored = rounds.filter((r) => Object.values(r.card.strokes).some((s) => s.some((x) => x !== null)));
  return scored.sort((a, b) => b.startsAt - a.startsAt)[0] ?? null;
}

/**
 * A golf card's headline number, 40 to 99, from average Stableford points: playing to handicap
 * (36) is a gold card, 40+ is elite, a debut round sits in the middle rather than on a bronze card.
 * Attendance plays no part, so a golfer is never branded a sick note for missing a Sunday.
 */
export function golfRating(avg: number | null, rounds: number): number {
  if (!rounds || avg === null) return 60;
  return Math.max(40, Math.min(99, Math.round(40 + (avg - 20) * 2.5)));
}
