import { describe, expect, it } from "vitest";
import { currentRound, golfRating, golfRoundSummary, golfTable, type GolfVote } from "./golf-table";
import type { Round } from "./golf-stats";
import type { StablefordCard } from "./stableford";
import { SPORTS } from "./sports";
import { tierOf } from "@/components/player-card";

const cats = SPORTS.golf.ratings;
// Nine par-4 holes, stroke indexes 1..9: off scratch, a par is 2 points and a birdie 3.
const holes = Array.from({ length: 9 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }));

function round(sessionId: string, startsAt: number, strokes: Record<string, (number | null)[]>, course = "Griffin"): Round {
  const card: StablefordCard = { holes, handicaps: {}, strokes, course: { id: "c1", name: course, tee: "Yellow" } };
  return { sessionId, title: `Round ${sessionId}`, startsAt, card };
}

const pars = Array(9).fill(4);
const oneBirdie = [3, ...Array(8).fill(4)];

describe("golf votes", () => {
  it("score on every golf category: best golfer 3, longest driver 2, shot of the day 2", () => {
    expect(cats.map((c) => [c.label, c.points])).toEqual([
      ["Best golfer", 3],
      ["Longest driver", 2],
      ["Shot of the day", 2],
    ]);
  });
});

describe("golfRoundSummary", () => {
  it("adds Stableford and vote points, best total first, and names the course", () => {
    const r = round("s1", 1, { ann: pars, bob: oneBirdie });
    const votes: GolfVote[] = [
      { sessionId: "s1", category: "motm", rateeId: "ann" },
      { sessionId: "s1", category: "grafter", rateeId: "ann" },
      { sessionId: "other", category: "motm", rateeId: "bob" },
    ];
    const s = golfRoundSummary(r, votes, cats);
    expect(s.course).toBe("Griffin");
    expect(s.rows.map((x) => [x.userId, x.stableford, x.votePoints, x.total])).toEqual([
      ["ann", 18, 5, 23],
      ["bob", 19, 0, 19],
    ]);
  });

  it("gives nobody anything for just being there", () => {
    const s = golfRoundSummary(round("s1", 1, { ann: Array(9).fill(null) }), [], cats);
    expect(s.rows).toEqual([]);
  });

  it("counts the holes entered so far, so the round is live while it's being played", () => {
    const s = golfRoundSummary(round("s1", 1, { ann: [4, 4, 4, null, null, null, null, null, null] }), [], cats);
    expect(s.rows[0]).toMatchObject({ stableford: 6, holesPlayed: 3 });
  });

  it("includes a player who only got votes", () => {
    const s = golfRoundSummary(round("s1", 1, {}), [{ sessionId: "s1", category: "howler", rateeId: "cat" }], cats);
    expect(s.rows).toEqual([expect.objectContaining({ userId: "cat", stableford: 0, votePoints: 2, total: 2 })]);
  });
});

describe("golfTable", () => {
  const rounds = [round("s1", 1, { ann: pars, bob: oneBirdie }), round("s2", 2, { ann: oneBirdie })];
  const votes: GolfVote[] = [{ sessionId: "s2", category: "motm", rateeId: "bob" }];

  it("adds every round up, with no attendance points and no penalties", () => {
    const t = golfTable(["ann", "bob", "cat"], rounds, votes, cats);
    expect(t.map((r) => [r.userId, r.points, r.rounds])).toEqual([
      ["ann", 37, 2],
      ["bob", 22, 1],
      ["cat", 0, 0],
    ]);
  });

  it("keeps the numbers a player card needs", () => {
    const ann = golfTable(["ann"], rounds, [], cats)[0];
    expect(ann).toMatchObject({ stableford: 37, votePoints: 0, avg: 18.5, best: 19, recent: [18, 19] });
    expect(ann.last).toEqual({ sessionId: "s2", title: "Round s2", total: 19, stableford: 19 });
  });

  it("counts a round with votes but no card towards points, not towards rounds played", () => {
    const bob = golfTable(["bob"], rounds, votes, cats)[0];
    expect(bob).toMatchObject({ rounds: 1, points: 22, votePoints: 3, avg: 19 });
    expect(bob.last?.sessionId).toBe("s2");
  });
});

describe("currentRound", () => {
  const a = round("s1", 1, { ann: pars });
  const b = round("s2", 2, { ann: pars });
  const empty = round("s3", 3, {});
  it("shows the round asked for, else the latest with a card in it", () => {
    expect(currentRound([a, b, empty], "s1")?.sessionId).toBe("s1");
    expect(currentRound([a, b, empty])?.sessionId).toBe("s2");
    expect(currentRound([a, b, empty], "nope")?.sessionId).toBe("s2");
    expect(currentRound([empty])).toBeNull();
  });
});

describe("golfRating", () => {
  it("puts playing to handicap on a gold card and a hot streak on elite", () => {
    expect(golfRating(36, 3)).toBe(80);
    expect(golfRating(40, 3)).toBe(90);
    expect(golfRating(30, 3)).toBe(65);
  });
  it("starts a new golfer on a silver card rather than a bronze one", () => {
    expect(golfRating(null, 0)).toBe(60);
    expect(tierOf(golfRating(null, 0))).toBe("silver");
  });
  it("stays on the 40 to 99 scale", () => {
    expect(golfRating(2, 1)).toBe(40);
    expect(golfRating(60, 1)).toBe(99);
  });
});
