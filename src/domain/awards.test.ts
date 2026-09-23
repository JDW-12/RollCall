import { describe, expect, it } from "vitest";
import { SPORTS } from "./sports";
import { computeTable } from "./table";
import { golfSeasonAwards, seasonAwards } from "./awards";

const cats = SPORTS.football.ratings;

describe("seasonAwards", () => {
  it("names a winner per award from the table", () => {
    const sessions = [1, 2, 3].map((i) => ({ id: `s${i}`, startsAt: i, status: "played" as const }));
    const rows = computeTable({
      memberIds: ["a", "b", "c"],
      sessions,
      rsvps: [
        ...sessions.map((s) => ({ sessionId: s.id, userId: "a", status: "in" as const, lateDrop: false })),
        ...sessions.map((s) => ({ sessionId: s.id, userId: "b", status: "in" as const, lateDrop: false })),
        { sessionId: "s1", userId: "c", status: "out" as const, lateDrop: true },
        { sessionId: "s2", userId: "c", status: "in" as const, lateDrop: false },
      ],
      attendance: [{ sessionId: "s2", userId: "c", attended: false }],
      ratings: [
        { sessionId: "s1", category: "motm", rateeId: "a" },
        { sessionId: "s2", category: "motm", rateeId: "a" },
        { sessionId: "s3", category: "grafter", rateeId: "b" },
        { sessionId: "s3", category: "howler", rateeId: "b" },
      ],
      categories: cats,
    });
    const awards = seasonAwards(rows, cats, 1);
    const by = Object.fromEntries(awards.map((a) => [a.key, a]));
    expect(by.champion.userId).toBe("a");
    expect(by.player.userId).toBe("a");
    expect(by.player.value).toBe(2);
    expect(by.iron.userId).toBe("a");
    expect(by.streak.value).toBe(3);
    expect(by.grafter.userId).toBe("b");
    expect(by.banter.userId).toBe("b");
    expect(by.sicknote.userId).toBe("c");
    expect(by.sicknote.value).toBe(2);
  });
  it("returns nothing before anyone has played", () => {
    expect(seasonAwards([], cats)).toEqual([]);
  });
});

describe("golfSeasonAwards", () => {
  const cats = [
    { key: "motm", label: "Best golfer", prompt: "", points: 3, stat: "BST" },
    { key: "grafter", label: "Longest driver", prompt: "", points: 2, stat: "LNG" },
  ];
  const table = [
    { userId: "ann", points: 60, rounds: 2 },
    { userId: "bob", points: 40, rounds: 2 },
    { userId: "cat", points: 0, rounds: 0 },
  ];
  const stats = new Map([
    ["ann", { best: { points: 34, title: "Griffin" }, birdies: 2, longestDrive: { yards: 260, title: "Griffin" }, ballsLost: 1 }],
    ["bob", { best: { points: 38, title: "Kingfisher" }, birdies: 5, longestDrive: { yards: 290, title: "Kingfisher" }, ballsLost: 7 }],
  ]);
  const votes = [
    { category: "motm", rateeId: "bob" },
    { category: "motm", rateeId: "bob" },
    { category: "motm", rateeId: "ann" },
  ];

  it("crowns the leaderboard's champion and names the rest from the cards and the votes", () => {
    const a = golfSeasonAwards(table, stats, votes, cats);
    const got = Object.fromEntries(a.map((x) => [x.key, [x.userId, x.value]]));
    expect(got).toEqual({ champion: ["ann", 60], player: ["bob", 2], round: ["bob", 38], birdies: ["bob", 5], drive: ["bob", 290], lost: ["bob", 7] });
    expect(a.find((x) => x.key === "player")?.label).toBe("Best golfer of the season");
  });

  it("never hands out attendance awards", () => {
    const keys = golfSeasonAwards(table, stats, votes, cats).map((a) => a.key);
    expect(keys).not.toContain("iron");
    expect(keys).not.toContain("streak");
    expect(keys).not.toContain("sicknote");
  });

  it("gives nothing before anyone has played", () => {
    expect(golfSeasonAwards([{ userId: "cat", points: 0, rounds: 0 }], new Map(), [], cats)).toEqual([]);
  });
});
