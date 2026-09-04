import { describe, expect, it } from "vitest";
import { SPORTS } from "./sports";
import { computeTable, sessionScore, turnUpRate } from "./table";

const cats = SPORTS.football.ratings;

describe("sessionScore", () => {
  it("rewards unanimous player of the match with a 10", () => {
    expect(sessionScore({ motm: 8 }, cats, 8)).toBe(10);
  });
  it("gives a quiet night a 6", () => {
    expect(sessionScore({}, cats, 8)).toBe(6);
  });
  it("docks the worst miss but never below 4", () => {
    expect(sessionScore({ howler: 8 }, cats, 8)).toBe(4.5);
    expect(sessionScore({ howler: 80 }, cats, 8)).toBe(4);
  });
});

describe("computeTable", () => {
  const sessions = [
    { id: "s1", startsAt: 1, status: "played" as const },
    { id: "s2", startsAt: 2, status: "played" as const },
    { id: "s3", startsAt: 3, status: "open" as const },
  ];
  it("scores attendance, votes, late drops and no-shows", () => {
    const rows = computeTable({
      memberIds: ["sam", "deano", "jonesy", "newbie"],
      sessions,
      rsvps: [
        { sessionId: "s1", userId: "sam", status: "in", lateDrop: false },
        { sessionId: "s1", userId: "deano", status: "in", lateDrop: false },
        { sessionId: "s1", userId: "jonesy", status: "out", lateDrop: true },
        { sessionId: "s2", userId: "sam", status: "in", lateDrop: false },
        { sessionId: "s2", userId: "deano", status: "in", lateDrop: false },
        { sessionId: "s2", userId: "jonesy", status: "in", lateDrop: false },
        { sessionId: "s3", userId: "sam", status: "in", lateDrop: false },
      ],
      attendance: [{ sessionId: "s2", userId: "jonesy", attended: false }],
      ratings: [
        { sessionId: "s1", category: "motm", rateeId: "sam" },
        { sessionId: "s1", category: "grafter", rateeId: "deano" },
        { sessionId: "s2", category: "motm", rateeId: "sam" },
        { sessionId: "s2", category: "motm", rateeId: "sam" },
        { sessionId: "s2", category: "howler", rateeId: "deano" },
      ],
      categories: cats,
    });
    const by = Object.fromEntries(rows.map((r) => [r.userId, r]));
    expect(rows[0].userId).toBe("sam");
    // sam: 2 x attended (6) + 3 motm votes (6) = 12
    expect(by.sam.points).toBe(12);
    expect(by.sam.played).toBe(2);
    expect(by.sam.streak).toBe(2);
    // deano: 6 + 1 grafter = 7; howler is banter only
    expect(by.deano.points).toBe(7);
    expect(by.deano.votes.howler).toBe(1);
    // jonesy: late drop (-2) then no-show (-3)
    expect(by.jonesy.points).toBe(-5);
    expect(by.jonesy.sickNotes).toBe(2);
    expect(by.jonesy.streak).toBe(0);
    expect(turnUpRate(by.jonesy)).toBe(0);
    // newbie never expected: no form, neutral card
    expect(by.newbie.form).toBeNull();
    expect(by.newbie.card.turnsUp).toBe(50);
    expect(by.newbie.points).toBe(0);
  });
  it("counts a confirmed walk-on as played even without an RSVP", () => {
    const rows = computeTable({
      memberIds: ["a", "w"],
      sessions: [{ id: "s", startsAt: 1, status: "played" }],
      rsvps: [{ sessionId: "s", userId: "a", status: "in", lateDrop: false }],
      attendance: [
        { sessionId: "s", userId: "a", attended: true },
        { sessionId: "s", userId: "w", attended: true },
      ],
      ratings: [],
      categories: cats,
    });
    const w = rows.find((r) => r.userId === "w")!;
    expect(w.played).toBe(1);
    expect(w.points).toBe(3);
    expect(w.noShows).toBe(0);
  });
  it("ignores open and cancelled sessions", () => {
    const rows = computeTable({
      memberIds: ["a"],
      sessions: [{ id: "x", startsAt: 1, status: "cancelled" }],
      rsvps: [{ sessionId: "x", userId: "a", status: "in", lateDrop: false }],
      attendance: [],
      ratings: [],
      categories: cats,
    });
    expect(rows[0].played).toBe(0);
  });
  it("form is a rolling window of the last five", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, startsAt: i, status: "played" as const }));
    const rows = computeTable({
      memberIds: ["a"],
      sessions: many,
      rsvps: many.map((s) => ({ sessionId: s.id, userId: "a", status: "in" as const, lateDrop: false })),
      attendance: [],
      ratings: many.slice(0, 3).map((s) => ({ sessionId: s.id, category: "motm", rateeId: "a" })),
      categories: cats,
    });
    // last five sessions had no votes -> 6.0
    expect(rows[0].form).toBe(6);
    expect(rows[0].streak).toBe(8);
  });
});
