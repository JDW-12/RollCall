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
