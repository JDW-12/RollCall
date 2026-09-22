import { NextResponse } from "next/server";
import { runStandingsSync } from "@/lib/league-feed";

/**
 * Vercel Cron target (see vercel.json). Refreshes every league table whose feed has gone stale.
 * Protected by CRON_SECRET, which Vercel sends as a bearer token. Safe to call repeatedly: a
 * competition pulled inside the refresh window is skipped.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("CRON_SECRET not set", { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorised", { status: 401 });
  return NextResponse.json(await runStandingsSync());
}
