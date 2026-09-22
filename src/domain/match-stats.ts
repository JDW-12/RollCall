/**
 * Season numbers for a team sport: appearances from attendance, goals, assists and the manager's
 * mark out of ten from each fixture. Kept separate from the crew table, which is about turning up.
 */

export type MatchStatRow = { sessionId: string; userId: string; goals: number; assists: number; rating: number | null };
export type Appearance = { sessionId: string; userId: string };

export type PlayerSeason = {
  userId: string;
  apps: number;
  goals: number;
  assists: number;
  /** Goals plus assists, the number every five-a-side argument ends on. */
  involvements: number;
  /** Average manager rating across the fixtures they were marked in, one decimal. Null until marked. */
  avgRating: number | null;
  ratedApps: number;
};

export function seasonStats(stats: MatchStatRow[], appearances: Appearance[]): PlayerSeason[] {
  const by = new Map<string, PlayerSeason>();
  const get = (userId: string) => {
    let row = by.get(userId);
    if (!row) {
      row = { userId, apps: 0, goals: 0, assists: 0, involvements: 0, avgRating: null, ratedApps: 0 };
      by.set(userId, row);
    }
    return row;
  };
  for (const a of appearances) get(a.userId).apps++;
  const ratingTotals = new Map<string, number>();
  for (const s of stats) {
    const row = get(s.userId);
    row.goals += Math.max(0, s.goals);
    row.assists += Math.max(0, s.assists);
    if (s.rating !== null && s.rating > 0) {
      row.ratedApps++;
      ratingTotals.set(s.userId, (ratingTotals.get(s.userId) ?? 0) + s.rating);
    }
  }
  for (const row of by.values()) {
    row.involvements = row.goals + row.assists;
    row.avgRating = row.ratedApps ? Math.round(((ratingTotals.get(row.userId) ?? 0) / row.ratedApps) * 10) / 10 : null;
  }
  return [...by.values()].sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.apps - a.apps || a.userId.localeCompare(b.userId));
}

export type SeasonLeaders = {
  topScorer: PlayerSeason | null;
  topAssister: PlayerSeason | null;
  /** Highest average rating, once someone has been marked in at least `minRated` fixtures. */
  bestRated: PlayerSeason | null;
};

export function seasonLeaders(rows: PlayerSeason[], minRated = 2): SeasonLeaders {
  const scorers = rows.filter((r) => r.goals > 0);
  const assisters = rows.filter((r) => r.assists > 0);
  const rated = rows.filter((r) => r.avgRating !== null && r.ratedApps >= minRated);
  return {
    topScorer: scorers[0] ?? null,
    topAssister: [...assisters].sort((a, b) => b.assists - a.assists || b.apps - a.apps)[0] ?? null,
    bestRated: [...rated].sort((a, b) => b.avgRating! - a.avgRating! || b.ratedApps - a.ratedApps)[0] ?? null,
  };
}

/** One player's line for a single fixture, as entered by the manager. */
export function statLine(s: { goals: number; assists: number; rating: number | null }): string {
  const bits: string[] = [];
  if (s.goals) bits.push(`${s.goals} goal${s.goals === 1 ? "" : "s"}`);
  if (s.assists) bits.push(`${s.assists} assist${s.assists === 1 ? "" : "s"}`);
  if (s.rating) bits.push(`${s.rating}/10`);
  return bits.join(" · ");
}
