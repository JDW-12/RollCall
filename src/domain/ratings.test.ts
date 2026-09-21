import { describe, expect, it } from "vitest";
import { buildRatings, ratingsFor, serialiseRatings } from "./ratings";
import { SPORTS } from "./sports";

describe("ratingsFor", () => {
  it("falls back to the sport defaults when nothing is stored or the stored list is broken", () => {
    expect(ratingsFor("golf", null)).toEqual(SPORTS.golf.ratings);
    expect(ratingsFor("golf", "not json")).toEqual(SPORTS.golf.ratings);
    expect(ratingsFor("padel", "[]")).toEqual(SPORTS.padel.ratings);
  });
  it("keeps positional keys and points so renamed categories keep their votes", () => {
    const stored = serialiseRatings(buildRatings([{ label: "Golfer of the day", prompt: "", stat: "" }, { label: "Best putter", prompt: "Who holed everything?", stat: "PUT" }, { label: "Worst shank", prompt: "", stat: "" }, { label: "Best dressed", prompt: "", stat: "" }]));
    const cats = ratingsFor("golf", stored);
    expect(cats.map((c) => c.key)).toEqual(["motm", "grafter", "howler", "cat4"]);
    expect(cats.map((c) => c.points)).toEqual([2, 1, 0, 0]);
    expect(cats[0].prompt).toBe("Who was golfer of the day?");
    expect(cats[1].stat).toBe("PUT");
    expect(cats[3].stat).toBe("BES");
  });
  it("rejects too few or too many", () => {
    expect(() => buildRatings([{ label: "One", prompt: "", stat: "" }])).toThrow(/at least 2/);
    expect(() => buildRatings(Array.from({ length: 6 }, (_, i) => ({ label: `C${i}`, prompt: "", stat: "" })))).toThrow(/Five/);
  });
});
