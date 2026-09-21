import { describe, expect, it } from "vitest";
import { buildIcs, escapeText } from "./ics";

describe("ics", () => {
  it("writes a valid calendar with UTC times and escaped text", () => {
    const ics = buildIcs(
      [{ uid: "s1@rollcall", title: "Tuesday 5s; Wk 1", startsAt: new Date("2026-09-22T19:00:00Z"), durationMin: 60, location: "Powerleague, Shoreditch", url: "https://x/y" }],
      "Tuesday FC",
      new Date("2026-09-20T10:00:00Z"),
    );
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART:20260922T190000Z");
    expect(ics).toContain("DTEND:20260922T200000Z");
    expect(ics).toContain("SUMMARY:Tuesday 5s\; Wk 1");
    expect(ics).toContain("LOCATION:Powerleague\\, Shoreditch");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("folds long lines", () => {
    const ics = buildIcs([{ uid: "u", title: "x".repeat(200), startsAt: new Date(0), durationMin: 30 }], "C");
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });
  it("escapes newlines", () => {
    expect(escapeText("a\nb")).toBe("a\\nb");
  });
});
