import { describe, expect, it } from "vitest";
import { nextUp, overallStats, type CrewSummary } from "./dashboard";

const base: CrewSummary = {
  crewId: "c",
  slug: "c",
  name: "Crew",
  sport: "football",
  hue: 140,
  role: "member",
  rank: 1,
  of: 5,
  points: 10,
  rating: 70,
  played: 0,
  expected: 0,
  lateDrops: 0,
  streak: 0,
  votes: 0,
  goals: 0,
  assists: 0,
  golf: null,
  next: null,
};

describe("dashboard", () => {
  it("adds up across crews: played, turn-up over every spot held, best streak, votes, goals", () => {
    const o = overallStats([
      { ...base, name: "Tuesday FC", played: 8, expected: 9, lateDrops: 1, streak: 4, votes: 3, goals: 5, assists: 2 },
      { ...base, name: "Padel", sport: "padel", played: 2, expected: 2, streak: 2, votes: 1 },
    ]);
    expect(o).toMatchObject({ crews: 2, played: 10, turnUpRate: 83, bestStreak: 4, votes: 4, goals: 5, assists: 2, golfBest: null });
  });

  it("has no turn-up rate before anyone held a spot, and takes the lowest golf round across golf crews", () => {
    const o = overallStats([
      { ...base, name: "Swingers", sport: "golf", golf: { bestToPar: 12, rounds: 3 } },
      { ...base, name: "Society", sport: "golf", golf: { bestToPar: 7, rounds: 1 } },
      { ...base, name: "New", sport: "golf", golf: { bestToPar: null, rounds: 0 } },
    ]);
    expect(o.turnUpRate).toBeNull();
    expect(o.golfBest).toEqual({ toPar: 7, crew: "Society" });
  });

  it("lists what's next across crews, soonest first", () => {
    const s = (id: string, startsAt: number) => ({ id, title: id, startsAt, venueName: "", mine: null });
    const list = nextUp([
      { ...base, name: "A", next: s("later", 300) },
      { ...base, name: "B", next: null },
      { ...base, name: "C", next: s("soon", 100) },
    ]);
    expect(list.map((n) => [n.id, n.crew.name])).toEqual([
      ["soon", "C"],
      ["later", "A"],
    ]);
  });
});
