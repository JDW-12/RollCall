import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { placesProvider, searchPlaces } from "@/lib/places";
import { allow } from "@/lib/ratelimit";

/** Venue typeahead for the session form. Signed-in members only, so the provider key isn't a free proxy. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ hits: [] }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const sport = (url.searchParams.get("sport") ?? "").slice(0, 20);
  if (q.trim().length < 2) return NextResponse.json({ hits: [], provider: placesProvider() });
  if (!(await allow("places_lookup", user.id, 120, 60 * 60_000))) return NextResponse.json({ hits: [], error: "Slow down a little." }, { status: 429 });
  const hits = await searchPlaces(q, sport);
  return NextResponse.json({ hits, provider: placesProvider() }, { headers: { "Cache-Control": "private, max-age=300" } });
}
