import { describe, expect, it } from "vitest";
import { applyCapacityChange, applyRsvp, isLateDrop, summarise, type RsvpRow, type SessionRules } from "./rsvp";

const H = 3_600_000;
const kickoff = 100 * H;
const rules: SessionRules = { capacity: 2, startsAt: kickoff, rsvpDeadlineAt: null, status: "open", lateDropHours: 24 };

const row = (userId: string, status: RsvpRow["status"], queuedAt: number, extra: Partial<RsvpRow> = {}): RsvpRow => ({
  userId,
  status,
  queuedAt,
  respondedAt: queuedAt,
  droppedAt: null,
  lateDrop: false,
  ...extra,
});

describe("applyRsvp", () => {
  it("fills spots then queues reserves in order", () => {
    let rows: RsvpRow[] = [];
    rows = applyRsvp(rules, rows, "a", "in", 1).rows;
    rows = applyRsvp(rules, rows, "b", "in", 2).rows;
    const r3 = applyRsvp(rules, rows, "c", "in", 3);
    expect(r3.changes).toEqual([{ type: "reserved", userId: "c" }]);
    expect(summarise(r3.rows, 2)).toMatchObject({ in: 2, reserve: 1, full: true, spotsLeft: 0 });
  });

  it("promotes the earliest reserve when someone drops", () => {
    const rows = [row("a", "in", 1), row("b", "in", 2), row("c", "reserve", 3), row("d", "reserve", 4)];
    const res = applyRsvp(rules, rows, "a", "out", 10 * H);
    expect(res.changes).toEqual([
      { type: "dropped", userId: "a", late: false },
      { type: "promoted", userId: "c" },
    ]);
    expect(res.rows.find((r) => r.userId === "c")?.status).toBe("in");
    expect(res.rows.find((r) => r.userId === "d")?.status).toBe("reserve");
  });

  it("flags a late drop inside the window", () => {
    const rows = [row("a", "in", 1)];
    const res = applyRsvp(rules, rows, "a", "out", kickoff - 2 * H);
    expect(res.changes[0]).toEqual({ type: "dropped", userId: "a", late: true });
    expect(res.rows[0].lateDrop).toBe(true);
    expect(res.rows[0].droppedAt).toBe(kickoff - 2 * H);
  });

  it("treats a drop after the RSVP deadline as late even outside the window", () => {
    const r: SessionRules = { ...rules, rsvpDeadlineAt: kickoff - 72 * H };
    expect(isLateDrop(r, kickoff - 60 * H)).toBe(true);
    expect(isLateDrop(r, kickoff - 80 * H)).toBe(false);
  });

  it("leaving the reserve list is never a late drop and promotes nobody", () => {
    const rows = [row("a", "in", 1), row("b", "in", 2), row("c", "reserve", 3)];
    const res = applyRsvp(rules, rows, "c", "out", kickoff - 1 * H);
    expect(res.changes).toEqual([{ type: "left_reserve", userId: "c" }]);
    expect(res.rows.find((r) => r.userId === "c")?.lateDrop).toBe(false);
  });

  it("coming back after an out takes a fresh queue position", () => {
    const rows = [row("a", "out", 1), row("b", "in", 2), row("c", "in", 3), row("d", "reserve", 4)];
    const res = applyRsvp(rules, rows, "a", "in", 5);
    const a = res.rows.find((r) => r.userId === "a")!;
    expect(a.status).toBe("reserve");
    expect(a.queuedAt).toBe(5);
    expect(res.changes).toEqual([{ type: "reserved", userId: "a" }]);
  });

  it("re-tapping in is a no-op", () => {
    const rows = [row("a", "in", 1)];
    const res = applyRsvp(rules, rows, "a", "in", 5);
    expect(res.changes).toEqual([]);
    expect(res.rows).toEqual(rows);
  });

  it("refuses when the session is not open or has started", () => {
    expect(() => applyRsvp({ ...rules, status: "played" }, [], "a", "in", 1)).toThrow();
    expect(() => applyRsvp(rules, [], "a", "in", kickoff + 1)).toThrow();
  });

  it("promotes reserves when capacity grows, never demotes", () => {
    const rows = [row("a", "in", 1), row("b", "in", 2), row("c", "reserve", 3), row("d", "reserve", 4)];
    const grown = applyCapacityChange(rows, 3, 9);
    expect(grown.changes).toEqual([{ type: "promoted", userId: "c" }]);
    const shrunk = applyCapacityChange(grown.rows, 1, 10);
    expect(shrunk.changes).toEqual([]);
    expect(shrunk.rows.filter((r) => r.status === "in").length).toBe(3);
  });
});
