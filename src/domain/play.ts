/**
 * Which round the Play tab opens. A round counts as "on" from three hours before its tee time until
 * three hours after it should have finished, so arriving early, a slow four-ball or scoring in the bar
 * afterwards all land in the right place. Only rounds you're in; the nearest tee time wins.
 */

export type PlayCandidate = { id: string; status: string; startsAt: number; durationMin: number };

const H = 3_600_000;

export function roundInPlay<T extends PlayCandidate>(rounds: T[], myRounds: Set<string>, now: number): T | null {
  const on = rounds.filter((r) => r.status !== "cancelled" && myRounds.has(r.id) && now >= r.startsAt - 3 * H && now <= r.startsAt + r.durationMin * 60_000 + 3 * H);
  on.sort((a, b) => Math.abs(a.startsAt - now) - Math.abs(b.startsAt - now));
  return on[0] ?? null;
}
