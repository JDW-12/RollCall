import { describe, expect, it } from "vitest";
import { holeResult, roundAwards, roundHighlights } from "./golf-highlights";
import { defaultHoles, type StablefordCard } from "./stableford";

describe("holeResult", () => {
  it("names every score", () => {
    expect(holeResult(1, 3)).toBe("holeInOne");
    expect(holeResult(2, 5)).toBe("albatross");
    expect(holeResult(3, 5)).toBe("eagle");
    expect(holeResult(3, 4)).toBe("birdie");
    expect(holeResult(4, 4)).toBe("par");
    expect(holeResult(5, 4)).toBe("bogey");
    expect(holeResult(6, 4)).toBe("double");
    expect(holeResult(9, 4)).toBe("worse");
  });
});

describe("roundHighlights and roundAwards", () => {
  const holes = defaultHoles();
  const par = holes.map((h) => h.par);
  const card: StablefordCard = {
    holes,
    handicaps: {},
    strokes: {
      josh: par.map((p, i) => (i === 2 ? 1 : i === 5 ? p - 1 : p)), // ace on the par-3 3rd, birdie on 6
      priya: par.map((p, i) => (i === 3 ? p - 2 : p + 1)), // eagle on the par-5 4th, bogeys elsewhere
      dan: [null, null, ...par.slice(2)],
    },
    extras: { josh: { longestDriveYards: 265, ballsLost: 3 }, priya: { longestDriveYards: 281, ballsLost: null } },
  };
  it("counts results per player and finds the best hole", () => {
    const hl = roundHighlights(card);
    const josh = hl.find((p) => p.userId === "josh")!;
    expect(josh.counts.holeInOne).toBe(1);
    expect(josh.counts.birdie).toBe(1);
    expect(josh.best).toEqual({ hole: 3, toPar: -2, result: "holeInOne" });
    const priya = hl.find((p) => p.userId === "priya")!;
    expect(priya.counts.eagle).toBe(1);
    expect(priya.counts.bogey).toBe(17);
    expect(hl.find((p) => p.userId === "dan")!.counts.par).toBe(16);
  });
  it("hands out the round awards", () => {
    const a = roundAwards(roundHighlights(card));
    expect(a.bestHole).toEqual({ userId: "josh", hole: 3, result: "holeInOne" });
    expect(a.longestDrive).toEqual({ userId: "priya", yards: 281 });
    expect(a.mostLost).toEqual({ userId: "josh", balls: 3 });
    expect(a.birdies[0]).toEqual({ userId: "josh", n: 2 });
  });
});
