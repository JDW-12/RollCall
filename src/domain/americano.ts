/**
 * Padel americano: everyone plays with and against everyone as evenly as possible.
 * Each match is 2 v 2 to a fixed number of points (usually 16, 21 or 24).
 * Points scored count towards the individual leaderboard.
 */

export type AmericanoMatch = {
  round: number;
  court: number;
  teamA: [string, string];
  teamB: [string, string];
  scoreA: number | null;
  scoreB: number | null;
};

export type Americano = {
  players: string[];
  pointsPerMatch: number;
  courts: number;
  rounds: number;
  matches: AmericanoMatch[];
};

/**
 * Generate a schedule. Uses the "circle method" on pairs: fix player 0, rotate the rest,
 * pair neighbours into teams, and face opposite pairs. Sit-outs rotate when players aren't a multiple of 4.
 */
export function generateAmericano(players: string[], opts: { pointsPerMatch?: number; courts?: number; rounds?: number } = {}): Americano {
  if (players.length < 4) throw new Error("Americano needs at least 4 players.");
  const pointsPerMatch = opts.pointsPerMatch ?? 16;
  const perRound = Math.floor(players.length / 4);
  const courts = Math.max(1, Math.min(opts.courts ?? perRound, perRound));
  const rounds = opts.rounds ?? Math.max(3, players.length - 1);

  const matches: AmericanoMatch[] = [];
  const n = players.length;
  // Rotation order. For odd or non-multiple-of-4 counts we rotate the whole list so sit-outs are shared.
  let order = [...players];
  for (let round = 1; round <= rounds; round++) {
    const active = order.slice(0, courts * 4);
    for (let c = 0; c < courts; c++) {
      const g = active.slice(c * 4, c * 4 + 4);
      // Vary partnerships across rounds: 3 distinct pairings for 4 players.
      const k = (round - 1) % 3;
      const [p0, p1, p2, p3] = g;
      const pairings: [[string, string], [string, string]][] = [
        [[p0, p1], [p2, p3]],
        [[p0, p2], [p1, p3]],
        [[p0, p3], [p1, p2]],
      ];
      const [teamA, teamB] = pairings[k];
      matches.push({ round, court: c + 1, teamA, teamB, scoreA: null, scoreB: null });
    }
    // Groups of four exhaust their three partnerships in three rounds, so for multiples of four
    // we reshuffle the groups every third round (circle method: first fixed, last moves to second).
    // When there are sit-outs, rotate every round so nobody sits out twice in a row.
    const rotate = () => {
      order = [order[0], order[n - 1], ...order.slice(1, n - 1)];
    };
    if (n % 4 !== 0) {
      order = [...order.slice(1), order[0]];
    } else if (round % 3 === 0) {
      rotate();
    }
  }
  return { players, pointsPerMatch, courts, rounds, matches };
}

export type AmericanoStanding = { userId: string; played: number; points: number; won: number; diff: number };

export function americanoStandings(a: Americano): AmericanoStanding[] {
  const map = new Map<string, AmericanoStanding>();
  for (const p of a.players) map.set(p, { userId: p, played: 0, points: 0, won: 0, diff: 0 });
  for (const m of a.matches) {
    if (m.scoreA === null || m.scoreB === null) continue;
    for (const p of m.teamA) {
      const s = map.get(p)!;
      s.played++;
      s.points += m.scoreA;
      s.diff += m.scoreA - m.scoreB;
      if (m.scoreA > m.scoreB) s.won++;
    }
    for (const p of m.teamB) {
      const s = map.get(p)!;
      s.played++;
      s.points += m.scoreB;
      s.diff += m.scoreB - m.scoreA;
      if (m.scoreB > m.scoreA) s.won++;
    }
  }
  return [...map.values()].sort((x, y) => y.points - x.points || y.diff - x.diff || y.won - x.won || x.userId.localeCompare(y.userId));
}
