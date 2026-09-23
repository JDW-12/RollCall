import { describe, expect, it } from "vitest";
import { venueSuggestions } from "./venues";

describe("venueSuggestions", () => {
  it("puts the crew's own venues first, most used, then curated ones without duplicates", () => {
    const s = venueSuggestions("football", [
      { venueName: "Powerleague Shoreditch", venueAddress: "" },
      { venueName: "powerleague shoreditch", venueAddress: "E2 7QX" },
      { venueName: "Goals Wembley", venueAddress: "" },
      { venueName: "", venueAddress: "" },
    ]);
    expect(s[0]).toEqual({ name: "Powerleague Shoreditch", address: "E2 7QX", count: 2 });
    expect(s[1].name).toBe("Goals Wembley");
    expect(s.filter((v) => v.name.toLowerCase() === "goals wembley")).toHaveLength(1);
    expect(s.length).toBeLessThanOrEqual(8);
  });
});

describe("golf venues carry their course card", () => {
  it("keeps the most recent course played at a venue, so the chip sets up the scorecard", () => {
    const [top] = venueSuggestions("golf", [
      { venueName: "Cottesmore", venueAddress: "RH11 9AT", course: { id: "c2", name: "Griffin", tee: "Yellow" } },
      { venueName: "Cottesmore", venueAddress: "", course: { id: "c1", name: "Griffin", tee: "White" } },
    ]);
    expect(top).toMatchObject({ name: "Cottesmore", count: 2, course: { ref: "library:c2", label: "Griffin · Yellow tees" } });
  });

  it("fills a course in from an older round when the newest had none", () => {
    const [top] = venueSuggestions("golf", [
      { venueName: "Cottesmore", venueAddress: "", course: null },
      { venueName: "Cottesmore", venueAddress: "", course: { id: "c1", name: "Griffin", tee: "" } },
    ]);
    expect(top.course).toEqual({ ref: "library:c1", label: "Griffin" });
  });

  it("leaves non-golf and curated venues without one", () => {
    const list = venueSuggestions("golf", []);
    expect(list.every((v) => !v.course)).toBe(true);
  });
});
