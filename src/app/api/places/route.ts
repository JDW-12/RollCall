import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { placesProvider, searchPlaces } from "@/lib/places";

/** Venue typeahead for the session form. Signed-in members only, so the provider key isn't a free proxy. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ hits: [] }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const sport = (url.searchParams.get("sport") ?? "").slice(0, 20);
  const hits = await searchPlaces(q, sport);
  return NextResponse.json({ hits, provider: placesProvider() }, { headers: { "Cache-Control": "private, max-age=300" } });
}
