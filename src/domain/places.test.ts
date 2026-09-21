import { describe, expect, it } from "vitest";
import { placesFromGoogle, placesFromPhoton, tidyAddress } from "./places";

describe("placesFromGoogle", () => {
  it("uses main text as the venue and secondary text as the address, without the country", () => {
    const hits = placesFromGoogle({
      suggestions: [
        { placePrediction: { placeId: "a", text: { text: "Powerleague Shoreditch, Shoreditch High Street, London, UK" }, structuredFormat: { mainText: { text: "Powerleague Shoreditch" }, secondaryText: { text: "Shoreditch High Street, London, UK" } } } },
        { queryPrediction: { text: { text: "powerleague" } } },
        { placePrediction: { placeId: "b", text: { text: "Powerleague Shoreditch" }, structuredFormat: { mainText: { text: "Powerleague Shoreditch" }, secondaryText: { text: "Shoreditch High Street, London, UK" } } } },
      ],
    });
    expect(hits).toEqual([{ name: "Powerleague Shoreditch", address: "Shoreditch High Street, London" }]);
  });
  it("copes with an empty or odd body", () => {
    expect(placesFromGoogle({})).toEqual([]);
    expect(placesFromGoogle(null)).toEqual([]);
  });
});

describe("placesFromPhoton", () => {
  it("prefers named places and builds a UK-style address from the parts", () => {
    const hits = placesFromPhoton({
      features: [
        { properties: { name: "Richmond Park Golf Course", street: "Roehampton Gate", city: "London", postcode: "SW15 5JR" } },
        { properties: { housenumber: "12", street: "Priory Lane", district: "Roehampton", postcode: "SW15 5JS" } },
        { properties: {} },
      ],
    });
    expect(hits[0]).toEqual({ name: "Richmond Park Golf Course", address: "Roehampton Gate, London, SW15 5JR" });
    expect(hits[1]).toEqual({ name: "12 Priory Lane", address: "Roehampton, SW15 5JS" });
    expect(hits).toHaveLength(2);
  });
});

describe("tidyAddress", () => {
  it("drops a trailing country only", () => {
    expect(tidyAddress("High Street, London, United Kingdom")).toBe("High Street, London");
    expect(tidyAddress("England Lane, Leeds")).toBe("England Lane, Leeds");
  });
});
