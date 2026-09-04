import { describe, expect, it } from "vitest";
import { americanoStandings, generateAmericano } from "./americano";
import { scorePrediction } from "./predictor";
import { defaultHoles, shotsOnHole, stablefordPoints, stablefordTotals } from "./stableford";
import { balanceTeams } from "./teams";

describe("balanceTeams", () => {
  it("makes two sides with similar form and sizes", () => {
    const players = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((id, i) => ({ userId: id, form: 5 + i * 0.5 }));
    const t = balanceTeams(players, 7);
    expect(t.a.length).toBe(5);
    expect(t.b.length).toBe(5);
    expect(Math.abs(t.formA - t.formB)).toBeLessThanOrEqual(0.5);
    expect(new Set([...t.a, ...t.b]).size).toBe(10);
  });
  it("is deterministic for a seed and varies across seeds", () => {
    const players = ["a", "b", "c", "d", "e", "f"].map((id) => ({ userId: id, form: null }));
    const t1 = balanceTeams(players, 1);
    const t2 = balanceTeams(players, 1);
    expect(t1).toEqual(t2);
    const seeds = new Set(Array.from({ length: 12 }, (_, s) => balanceTeams(players, s).a.join(",")));
    expect(seeds.size).toBeGreaterThan(1);
  });
  it("handles odd numbers", () => {
    const t = balanceTeams(["a", "b", "c", "d", "e"].map((id) => ({ userId: id, form: 6 })), 3);
    expect(t.a.length + t.b.length).toBe(5);
    expect(Math.abs(t.a.length - t.b.length)).toBe(1);
  });
});

describe("americano", () => {
  it("schedules four players so partnerships rotate", () => {
    const a = generateAmericano(["p", "q", "r", "s"], { rounds: 3 });
    expect(a.matches).toHaveLength(3);
    const partners = a.matches.map((m) => [m.teamA.slice().sort().join(""), m.teamB.slice().sort().join("")].sort().join("|"));
    expect(new Set(partners).size).toBe(3);
  });
  it("uses two courts for eight players and shares sit-outs for six", () => {
    const eight = generateAmericano(["1", "2", "3", "4", "5", "6", "7", "8"], { rounds: 4 });
    expect(eight.courts).toBe(2);
    expect(eight.matches).toHaveLength(8);
    const six = generateAmericano(["1", "2", "3", "4", "5", "6"], { rounds: 6 });
    const appearances = new Map<string, number>();
    for (const m of six.matches) for (const p of [...m.teamA, ...m.teamB]) appearances.set(p, (appearances.get(p) ?? 0) + 1);
    const counts = [...appearances.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });
  it("ranks by points then difference", () => {
    const a = generateAmericano(["p", "q", "r", "s"], { rounds: 1 });
    a.matches[0].scoreA = 10;
    a.matches[0].scoreB = 6;
    const st = americanoStandings(a);
    expect(st[0].points).toBe(10);
    expect(st[0].won).toBe(1);
    expect(st[3].diff).toBe(-4);
  });
  it("refuses fewer than four", () => {
    expect(() => generateAmericano(["a", "b", "c"])).toThrow();
  });
});

describe("stableford", () => {
  it("gives shots on the lowest stroke indexes first", () => {
    expect(shotsOnHole(18, 1)).toBe(1);
    expect(shotsOnHole(18, 18)).toBe(1);
    expect(shotsOnHole(5, 5)).toBe(1);
    expect(shotsOnHole(5, 6)).toBe(0);
    expect(shotsOnHole(20, 2)).toBe(2);
    expect(shotsOnHole(20, 3)).toBe(1);
    expect(shotsOnHole(0, 1)).toBe(0);
  });
  it("scores a net par as two points and never below zero", () => {
    expect(stablefordPoints(5, 4, 1, 18)).toBe(2);
    expect(stablefordPoints(3, 4, 18, 0)).toBe(3);
    expect(stablefordPoints(9, 4, 18, 0)).toBe(0);
    expect(stablefordPoints(null, 4, 1, 10)).toBe(0);
  });
  it("totals a card and marks incomplete rounds", () => {
    const holes = defaultHoles();
    const par = holes.map((h) => h.par);
    const totals = stablefordTotals({
      holes,
      handicaps: { ann: 0, bob: 18 },
      strokes: { ann: par, bob: [...par.slice(0, 17), null] },
    });
    expect(totals[0].userId).toBe("bob");
    expect(totals[0].points).toBe(3 * 17);
    expect(totals[0].gross).toBeNull();
    expect(totals[1].points).toBe(36);
    expect(totals[1].gross).toBe(par.reduce((a, b) => a + b, 0));
  });
});

describe("predictor", () => {
  const result = { finishing: ["Norris", "Verstappen", "Leclerc", "Piastri"], firstOut: "Stroll" };
  it("scores exact spots, podium hits and first out", () => {
    expect(scorePrediction({ podium: ["Norris", "Verstappen", "Leclerc"], firstOut: "Stroll" }, result)).toBe(35);
    expect(scorePrediction({ podium: ["Verstappen", "Norris", "Piastri"], firstOut: null }, result)).toBe(8);
    expect(scorePrediction({ podium: ["Hamilton", "Russell", "Alonso"], firstOut: "Gasly" }, result)).toBe(0);
  });
});
