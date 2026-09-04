import { describe, expect, it } from "vitest";
import { balances, previewShare, settleSession, splitEvenly } from "./money";

describe("splitEvenly", () => {
  it("adds up exactly and gives the remainder to the first payers", () => {
    const s = splitEvenly(1000, ["a", "b", "c"]);
    expect([...s.values()]).toEqual([334, 333, 333]);
    expect([...s.values()].reduce((x, y) => x + y, 0)).toBe(1000);
  });
  it("handles zero and no payers", () => {
    expect([...splitEvenly(0, ["a"]).values()]).toEqual([0]);
    expect(splitEvenly(500, []).size).toBe(0);
  });
});

describe("settleSession", () => {
  it("splits a total booking between those who played, no-shows and late drops", () => {
    const charges = settleSession({
      costMode: "total",
      costPence: 6500,
      playing: ["a", "b", "c"],
      attended: new Map([["c", false]]),
      lateDrops: ["d"],
    });
    expect(charges.map((c) => c.reason)).toEqual(["share", "share", "no_show", "late_drop"]);
    expect(charges.reduce((t, c) => t + c.amountPence, 0)).toBe(6500);
    expect(charges.map((c) => c.amountPence)).toEqual([1625, 1625, 1625, 1625]);
  });
  it("charges the fixed amount per head", () => {
    const charges = settleSession({ costMode: "per_head", costPence: 3500, playing: ["a", "b"], attended: new Map(), lateDrops: [] });
    expect(charges).toEqual([
      { userId: "a", amountPence: 3500, reason: "share" },
      { userId: "b", amountPence: 3500, reason: "share" },
    ]);
  });
  it("charges nothing for a free session", () => {
    expect(settleSession({ costMode: "total", costPence: 0, playing: ["a"], attended: new Map(), lateDrops: [] })).toEqual([]);
  });
  it("does not double-charge a late dropper who somehow also played", () => {
    const charges = settleSession({ costMode: "per_head", costPence: 100, playing: ["a"], attended: new Map(), lateDrops: ["a"] });
    expect(charges).toHaveLength(1);
  });
});

describe("balances", () => {
  it("nets charges against payments per player", () => {
    const b = balances([
      { userId: "a", kind: "charge", amountPence: 650, sessionId: "s1" },
      { userId: "a", kind: "payment", amountPence: 650, sessionId: "s1" },
      { userId: "b", kind: "charge", amountPence: 650, sessionId: "s1" },
      { userId: "b", kind: "payment", amountPence: 1000, sessionId: null },
    ]);
    expect(b.get("a")?.owed).toBe(0);
    expect(b.get("b")?.owed).toBe(-350);
  });
});

describe("previewShare", () => {
  it("rounds up so the organiser is never short", () => {
    expect(previewShare("total", 6500, 10)).toBe(650);
    expect(previewShare("total", 1000, 3)).toBe(334);
    expect(previewShare("per_head", 3500, 99)).toBe(3500);
    expect(previewShare("total", 6500, 0)).toBe(6500);
  });
});
