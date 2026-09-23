/**
 * The personal dashboard: one player's numbers from every crew they're in, whatever the sport, and
 * what's next across all of them. Pure: the loader (lib/dashboard) fetches, this adds up.
 */

export type RsvpState = "in" | "reserve" | "out" | null;

export type CrewSummary = {
  crewId: string;
  slug: string;
  name: string;
  sport: string;
  hue: number;
  role: string;
  /** Position on the crew's table or leader board; null before anyone has a point. */
  rank: number | null;
  of: number;
  points: number;
  /** The player card number, 40-99. */
  rating: number;
  played: number;
  expected: number;
  lateDrops: number;
  streak: number;
  votes: number;
  goals: number;
  assists: number;
  /** Golf only: best round against par over complete rounds, and how many there were. */
  golf: { bestToPar: number | null; rounds: number } | null;
  next: { id: string; title: string; startsAt: number; venueName: string; mine: RsvpState } | null;
};

export type Overall = {
  crews: number;
  played: number;
  /** Share of the sessions you held a spot for that you turned up to, 0-100. Null before any. */
  turnUpRate: number | null;
  bestStreak: number;
  votes: number;
  goals: number;
  assists: number;
  /** Your best golf round against par across golf crews, with where. */
  golfBest: { toPar: number; crew: string } | null;
};

export function overallStats(crews: CrewSummary[]): Overall {
  const sum = (f: (c: CrewSummary) => number) => crews.reduce((a, c) => a + f(c), 0);
  const denom = sum((c) => c.expected + c.lateDrops);
  const golfBest = crews.reduce<Overall["golfBest"]>((b, c) => {
    const t = c.golf?.bestToPar;
    return t === null || t === undefined || (b && b.toPar <= t) ? b : { toPar: t, crew: c.name };
  }, null);
  return {
    crews: crews.length,
    played: sum((c) => c.played),
    turnUpRate: denom ? Math.round((sum((c) => c.played) / denom) * 100) : null,
    bestStreak: Math.max(0, ...crews.map((c) => c.streak)),
    votes: sum((c) => c.votes),
    goals: sum((c) => c.goals),
    assists: sum((c) => c.assists),
    golfBest,
  };
}

/** The next few sessions across every crew, soonest first, with the crew they belong to. */
export function nextUp(crews: CrewSummary[], limit = 3): (NonNullable<CrewSummary["next"]> & { crew: CrewSummary })[] {
  return crews
    .flatMap((c) => (c.next ? [{ ...c.next, crew: c }] : []))
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, limit);
}
