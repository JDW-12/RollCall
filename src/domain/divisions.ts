import { sameTeam, type StandingRow } from "./league";

/**
 * Sharing one league table between every crew that plays in the division.
 *
 * Sourcing a table is the only part of the club hub that asks anything of a manager, and asking a
 * Sunday-league player to go and get a feed snippet out of their league's admin is too much. So the
 * table is treated as a property of the division rather than of a crew, exactly like the golf course
 * library: the first crew to source it does so for everyone, and every crew that joins that division
 * afterwards gets a live table without doing anything at all.
 *
 * Two crews are matched to the same division two ways. A shared key, when both linked the same
 * league page, is exact. Failing that the teams themselves are the fingerprint: a crew's own name
 * plus the opponents it has played are checked against the teams in each table we already hold, and
 * a division that contains enough of them is almost certainly theirs. The second way needs nothing
 * from the manager beyond the fixtures they were pinning anyway.
 */

/**
 * The identity a division is shared under. A league page address is used when there is one, because
 * two crews in the same division reach the same page; a name is never used on its own, since half
 * the leagues in the country have a "Division 3".
 */
export function divisionKeyFrom(externalUrl: string, feedUrl = ""): string {
  return normaliseUrl(externalUrl) || normaliseUrl(feedUrl) || "";
}

function normaliseUrl(raw: string): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return "";
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  // Query order varies between the links different people copy; sorting makes them the same key.
  const params = [...url.searchParams.entries()]
    .filter(([k]) => !/^(utm_|fbclid|gclid)/i.test(k))
    .map(([k, v]) => `${k.toLowerCase()}=${v.toLowerCase()}`)
    .sort();
  return `${host}${path}${params.length ? `?${params.join("&")}` : ""}`.slice(0, 300);
}

export type DivisionCandidate = {
  competitionId: string;
  /** The key it is shared under, empty when that crew linked no league page. */
  divisionKey: string;
  crewId: string;
  crewName: string;
  name: string;
  teams: string[];
  /** When its table was last sourced, so the freshest of several matches wins. */
  updatedAt: number;
};

export type DivisionMatch = { candidate: DivisionCandidate; matched: string[] };

/** The teams in a table, for fingerprinting a division. */
export function teamsOf(standings: StandingRow[]): string[] {
  return standings.map((r) => r.team).filter(Boolean);
}

/**
 * Picks the division a crew is playing in from the tables other crews have already sourced.
 *
 * Deliberately cautious: showing a crew the wrong division's table is far worse than showing none,
 * so a candidate needs at least three of the crew's known teams, and must not be beaten by another
 * candidate — two divisions matching equally well means we cannot tell them apart and say nothing.
 */
export function matchDivision(known: string[], candidates: DivisionCandidate[]): DivisionMatch | null {
  const names = [...new Set(known.map((n) => n.trim()).filter(Boolean))];
  if (names.length < 3) return null;

  const scored = candidates
    .map((candidate) => ({ candidate, matched: names.filter((n) => candidate.teams.some((t) => sameTeam(t, n))) }))
    .filter((s) => s.matched.length >= 3)
    .sort((a, b) => b.matched.length - a.matched.length || b.candidate.updatedAt - a.candidate.updatedAt);

  const best = scored[0];
  if (!best) return null;
  // A tie on evidence between two different divisions is a guess, and a guess is not good enough.
  const rival = scored.find((s) => s.candidate.competitionId !== best.candidate.competitionId);
  if (rival && rival.matched.length === best.matched.length && rival.candidate.updatedAt === best.candidate.updatedAt) return null;
  return best;
}

/**
 * Every team name a crew is known to share a division with: its own, and everyone it has a fixture
 * against. Enough to fingerprint a division after three or four games.
 */
export function knownTeams(ourName: string, opponents: string[]): string[] {
  return [ourName, ...opponents].map((n) => n.trim()).filter(Boolean);
}

/** Is a manually pasted table old enough to be worth a nudge? Leagues move once a week. */
export function tableIsStale(updatedAt: Date | null, now = Date.now()): boolean {
  if (!updatedAt) return false;
  return now - updatedAt.getTime() > 10 * 24 * 60 * 60 * 1000;
}
