import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { track } from "@/lib/events";
import { safeNext } from "@/lib/redirects";

/**
 * Referral landing: /go?ref=<crewId>&to=/start
 * Remembers which crew's shared card brought this person here, then sends them on.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") ?? "";
  const to = safeNext(url.searchParams.get("to") ?? "/start", "/start");
  const res = NextResponse.redirect(new URL(to, req.url), { status: 302 });
  if (/^[a-z0-9]{6,20}$/.test(ref)) {
    const db = await getDb();
    const crew = (await db.select({ id: schema.crews.id }).from(schema.crews).where(eq(schema.crews.id, ref)).limit(1))[0];
    if (crew) {
      res.cookies.set("rc_ref", crew.id, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, httpOnly: true });
      await track("referral_landed", { crewId: crew.id, payload: { to } });
    }
  }
  return res;
}
