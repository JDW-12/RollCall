import { describe, expect, it } from "vitest";
import { SPORTS } from "./sports";
import { computeTable } from "./table";
import { seasonAwards } from "./awards";

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
