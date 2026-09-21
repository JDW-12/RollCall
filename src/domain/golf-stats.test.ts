import { describe, expect, it } from "vitest";
import { golfStats, type Round } from "./golf-stats";
import { defaultHoles, type StablefordCard } from "./stableford";

const holes = defaultHoles();
const par = holes.map((h) => h.par);
const card = (strokes: Record<string, (number | null)[]>, handicaps: Record<string, number> = {}): StablefordCard => ({ holes, handicaps, strokes });

describe("golfStats", () => {
  it("counts complete rounds, average, best, wins and the last five, oldest first", () => {
    const rounds: Round[] = [
      { sessionId: "s1", title: "Round 1", startsAt: 1, card: card({ josh: par, priya: par.map((p) => p + 1) }, { josh: 10 }) }, // josh level par off 10 = 46, priya 18 → josh wins
      { sessionId: "s2", title: "Round 2", startsAt: 2, card: card({ josh: par.map((p) => p + 1), priya: par }, { josh: 12 }) }, // josh +1 a hole off 12 = 30, priya 36
      { sessionId: "s3", title: "Round 3", startsAt: 3, card: card({ josh: [...par.slice(0, 17), null], priya: par }) }, // josh picked up on 18: not a round
      { sessionId: "s4", title: "Round 4", startsAt: 4, card: card({ josh: par, priya: par }) }, // tie: both win
    ];
    const s = golfStats(rounds, "josh");
    expect(s.rounds).toBe(3);
    expect(s.avg).toBe(37.3);
    expect(s.best).toEqual({ points: 46, title: "Round 1" });
    expect(s.wins).toBe(2);
    expect(s.recent).toEqual([46, 30, 36]);
    expect(s.handicap).toBe(12);
  });
  it("is empty for someone with no complete card", () => {
    expect(golfStats([], "x")).toEqual({ rounds: 0, avg: null, best: null, wins: 0, recent: [], handicap: null });
  });
});
