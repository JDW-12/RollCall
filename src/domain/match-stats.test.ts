import { describe, expect, it } from "vitest";
import { seasonLeaders, seasonStats, statLine } from "./match-stats";

const apps = [
  { sessionId: "s1", userId: "josh" },
  { sessionId: "s2", userId: "josh" },
  { sessionId: "s3", userId: "josh" },
  { sessionId: "s1", userId: "priya" },
  { sessionId: "s2", userId: "priya" },
  { sessionId: "s1", userId: "dan" },
];
const stats = [
  { sessionId: "s1", userId: "josh", goals: 2, assists: 1, rating: 9 },
  { sessionId: "s2", userId: "josh", goals: 1, assists: 0, rating: 7 },
  { sessionId: "s3", userId: "josh", goals: 0, assists: 2, rating: null },
  { sessionId: "s1", userId: "priya", goals: 1, assists: 3, rating: 8 },
  { sessionId: "s2", userId: "priya", goals: 0, assists: 1, rating: 8 },
  { sessionId: "s1", userId: "dan", goals: 0, assists: 0, rating: 5 },
];

describe("seasonStats", () => {
  it("counts appearances from attendance and the rest from the fixtures", () => {
    const rows = seasonStats(stats, apps);
    const josh = rows.find((r) => r.userId === "josh")!;
    expect(josh).toMatchObject({ apps: 3, goals: 3, assists: 3, involvements: 6, ratedApps: 2, avgRating: 8 });
    const priya = rows.find((r) => r.userId === "priya")!;
    expect(priya).toMatchObject({ apps: 2, goals: 1, assists: 4, avgRating: 8 });
    expect(rows[0].userId).toBe("josh"); // most goals first
  });
  it("leaves the average null until someone has been marked", () => {
    const rows = seasonStats([{ sessionId: "s1", userId: "x", goals: 1, assists: 0, rating: null }], [{ sessionId: "s1", userId: "x" }]);
    expect(rows[0].avgRating).toBeNull();
    expect(rows[0].ratedApps).toBe(0);
  });
  it("counts someone who turned up but did nothing", () => {
    const rows = seasonStats([], [{ sessionId: "s1", userId: "sub" }]);
    expect(rows[0]).toMatchObject({ userId: "sub", apps: 1, goals: 0, involvements: 0 });
  });
});

describe("seasonLeaders", () => {
  it("names the top scorer, the top assister and the best marked player", () => {
    const l = seasonLeaders(seasonStats(stats, apps));
    expect(l.topScorer?.userId).toBe("josh");
    expect(l.topAssister?.userId).toBe("priya");
    expect(l.bestRated?.userId).toBe("josh"); // 8.0 from two marks; Dan's 5 is one mark only
  });
  it("needs a couple of marks before crowning anyone", () => {
    const l = seasonLeaders(seasonStats([{ sessionId: "s1", userId: "dan", goals: 0, assists: 0, rating: 10 }], [{ sessionId: "s1", userId: "dan" }]));
    expect(l.bestRated).toBeNull();
    expect(l.topScorer).toBeNull();
  });
});

describe("statLine", () => {
  it("reads like a match report, and says nothing when there's nothing to say", () => {
    expect(statLine({ goals: 2, assists: 1, rating: 9 })).toBe("2 goals · 1 assist · 9/10");
    expect(statLine({ goals: 0, assists: 0, rating: null })).toBe("");
  });
});
