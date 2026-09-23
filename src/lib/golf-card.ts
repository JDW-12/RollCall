import "server-only";
import type { Crew } from "@/db/schema";
import { ratingsFor } from "@/domain/ratings";
import { golfStats } from "@/domain/golf-stats";
import { golfRating, golfRoundSummary, golfTable, type GolfRoundRow, type GolfRoundSummary, type GolfTableRow } from "@/domain/golf-table";
import type { GolfCardStats } from "@/components/player-card";
import { golfLeaderboardData } from "./queries";

export type GolfPlayer = {
  card: GolfCardStats;
  row: GolfTableRow;
  /** Position on the golf leaderboard, from 1. */
  rank: number;
  /** Their most recent round and their line in it, with where they finished. */
  latest: { round: GolfRoundSummary; mine: GolfRoundRow; place: number } | null;
};

/**
 * Everything a golf player card needs, from the golf leaderboard rather than the attendance table:
 * points, rank and rating all come from the card and the votes. One load serves every member, so the
 * home page can show the whole crew without a query per player.
 */
export async function golfPlayers(crew: Crew) {
  const { members, rounds, votes } = await golfLeaderboardData(crew);
  const cats = ratingsFor(crew.sport, crew.ratings);
  const table = golfTable(
    members.map((m) => m.id),
    rounds,
    votes,
    cats,
  );
  const player = (userId: string): GolfPlayer | null => {
    const idx = table.findIndex((r) => r.userId === userId);
    if (idx === -1) return null;
    const row = table[idx];
    const g = golfStats(rounds, userId);
    const birdies = g.results.birdie + g.results.eagle + g.results.albatross + g.results.holeInOne;
    const card: GolfCardStats = { handicap: g.handicap, avg: g.avg, best: g.best?.points ?? null, birdies, wins: g.wins, rounds: g.rounds, overall: golfRating(row.avg, row.rounds) };
    let latest: GolfPlayer["latest"] = null;
    const round = row.last ? rounds.find((r) => r.sessionId === row.last!.sessionId) : undefined;
    if (round) {
      const summary = golfRoundSummary(round, votes, cats);
      const place = summary.rows.findIndex((r) => r.userId === userId);
      if (place !== -1) latest = { round: summary, mine: summary.rows[place], place: place + 1 };
    }
    return { card, row, rank: idx + 1, latest };
  };
  return { members, table, player, rounds, votes, cats };
}
