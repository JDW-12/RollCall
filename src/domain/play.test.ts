import { describe, expect, it } from "vitest";
import { roundInPlay } from "./play";

const H = 3_600_000;
const now = Date.UTC(2026, 8, 27, 10);
const r = (id: string, startsAt: number, status = "open") => ({ id, status, startsAt, durationMin: 240 });

describe("roundInPlay", () => {
  it("opens the round you're in that's on now, from early arrival to after the round", () => {
    const rounds = [r("early", now + 2 * H), r("tomorrow", now + 24 * H), r("notMine", now)];
    expect(roundInPlay(rounds, new Set(["early", "tomorrow"]), now)?.id).toBe("early");
    // Four hours of golf and three in the bar: still on seven hours after the tee time.
    expect(roundInPlay([r("done", now - 7 * H)], new Set(["done"]), now)?.id).toBe("done");
    expect(roundInPlay([r("old", now - 8 * H)], new Set(["old"]), now)).toBeNull();
  });

  it("skips cancelled rounds and rounds you're not in, and picks the nearest tee time", () => {
    expect(roundInPlay([r("x", now, "cancelled")], new Set(["x"]), now)).toBeNull();
    expect(roundInPlay([r("a", now - 2 * H), r("b", now + 1 * H)], new Set(["a", "b"]), now)?.id).toBe("b");
    expect(roundInPlay([r("a", now)], new Set(), now)).toBeNull();
  });
});
