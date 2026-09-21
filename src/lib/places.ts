import "server-only";
import { placesFromGoogle, placesFromPhoton, type PlaceHit } from "@/domain/places";

/**
 * Venue search for the session form. Google Places Autocomplete (New) when GOOGLE_MAPS_API_KEY is
 * set (best for named venues: pitches, courts, clubs), otherwise Photon, the free OpenStreetMap
 * geocoder, which needs no key and is fine for a pilot. Both are biased to London.
 */

const LONDON = { latitude: 51.5074, longitude: -0.1278 };

export function placesProvider(): "google" | "photon" {
  return process.env.GOOGLE_MAPS_API_KEY ? "google" : "photon";
}

export async function searchPlaces(query: string, sport = ""): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    return placesProvider() === "google" ? await google(q) : await photon(q, sport);
  } catch (e) {
    console.error("places lookup failed", e);
    return [];
  }
}

async function google(q: string): Promise<PlaceHit[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY! },
    body: JSON.stringify({
      input: q,
      includedRegionCodes: ["gb"],
      languageCode: "en-GB",
      locationBias: { circle: { center: LONDON, radius: 50_000 } },
    }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    console.error("Google Places", res.status, await res.text());
    return [];
  }
  return placesFromGoogle(await res.json()).slice(0, 6);
}

async function photon(q: string, sport: string): Promise<PlaceHit[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("lat", String(LONDON.latitude));
  url.searchParams.set("lon", String(LONDON.longitude));
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "en");
  // Photon can filter by OSM tag; nudging towards leisure venues cuts the noise for sport searches.
  if (sport === "golf") url.searchParams.append("osm_tag", "leisure:golf_course");
  const res = await fetch(url, { headers: { "User-Agent": "RollCall/1.0 (venue search)" }, signal: AbortSignal.timeout(4000) });
  if (!res.ok) return [];
  const hits = placesFromPhoton(await res.json());
  if (hits.length || sport !== "golf") return hits.slice(0, 6);
  // No tagged golf course matched: fall back to an untagged search so a driving range or club house still shows.
  url.searchParams.delete("osm_tag");
  const res2 = await fetch(url, { headers: { "User-Agent": "RollCall/1.0 (venue search)" }, signal: AbortSignal.timeout(4000) });
  return res2.ok ? placesFromPhoton(await res2.json()).slice(0, 6) : [];
}
