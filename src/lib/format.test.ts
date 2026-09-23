import { describe, expect, it } from "vitest";
import { fromLocalInput, toLocalInput, pounds, parsePounds, fmtAgo, fmtToPar } from "./format";

describe("London time round-trips", () => {
  it("handles BST and GMT", () => {
    const summer = fromLocalInput("2026-07-14T20:00")!;
    expect(summer.toISOString()).toBe("2026-07-14T19:00:00.000Z");
    expect(toLocalInput(summer)).toBe("2026-07-14T20:00");
    const winter = fromLocalInput("2026-12-01T20:00")!;
    expect(winter.toISOString()).toBe("2026-12-01T20:00:00.000Z");
    expect(toLocalInput(winter)).toBe("2026-12-01T20:00");
  });
  it("never emits hour 24", () => {
    expect(toLocalInput(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12-01T00:00");
  });
  it("survives the clocks going back", () => {
    // 25 Oct 2026 01:30 happens twice in London; we accept either instant, and the round-trip must be stable.
    const d = fromLocalInput("2026-10-25T01:30")!;
    expect(toLocalInput(d)).toBe("2026-10-25T01:30");
  });
});

describe("pounds", () => {
  it("formats and parses", () => {
    expect(pounds(650)).toBe("£6.50");
    expect(pounds(6500)).toBe("£65");
    expect(pounds(-5)).toBe("-£0.05");
    expect(parsePounds("6.5")).toBe(650);
    expect(parsePounds("£65")).toBe(6500);
    expect(parsePounds("abc")).toBeNull();
  });
});

describe("fmtAgo", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const ago = (ms: number) => fmtAgo(new Date(now.getTime() - ms), now);

  it("reads the recent past in the unit that fits", () => {
    expect(ago(10_000)).toBe("just now");
    expect(ago(12 * 60_000)).toBe("12 minutes ago");
    expect(ago(60 * 60_000)).toBe("1 hour ago");
    expect(ago(5 * 60 * 60_000)).toBe("5 hours ago");
    expect(ago(3 * 24 * 60 * 60_000)).toBe("3 days ago");
  });

  it("falls back to a date once it is over a month old", () => {
    expect(ago(60 * 24 * 60 * 60_000)).toMatch(/Jul/);
  });
});

describe("fmtToPar", () => {
  it("writes over, level and under par the way golfers do", () => {
    expect(fmtToPar(22)).toBe("+22");
    expect(fmtToPar(0)).toBe("E");
    expect(fmtToPar(-3)).toBe("−3");
    expect(fmtToPar(6.6)).toBe("+7");
  });
});
