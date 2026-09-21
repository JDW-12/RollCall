import { describe, expect, it } from "vitest";
import { commitBy } from "./deadline";

const H = 3_600_000;
describe("commitBy", () => {
  const startsAt = new Date(100 * H);
  it("uses the crew window when there is no deadline", () => {
    expect(commitBy({ startsAt, rsvpDeadlineAt: null }, 24).getTime()).toBe(76 * H);
  });
  it("uses an earlier explicit deadline", () => {
    expect(commitBy({ startsAt, rsvpDeadlineAt: new Date(50 * H) }, 24).getTime()).toBe(50 * H);
  });
  it("ignores a deadline later than the window", () => {
    expect(commitBy({ startsAt, rsvpDeadlineAt: new Date(90 * H) }, 24).getTime()).toBe(76 * H);
  });
});
