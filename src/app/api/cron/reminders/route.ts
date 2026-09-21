import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

/**
 * Vercel Cron target (see vercel.json). Protected by CRON_SECRET, which Vercel sends as a bearer token.
 * Safe to call as often as you like: each session is reminded once.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("CRON_SECRET not set", { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorised", { status: 401 });
  const result = await runReminders();
  return NextResponse.json(result);
}
