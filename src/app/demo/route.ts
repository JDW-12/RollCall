import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db/client";
import { startSession, endSession } from "@/lib/auth";
import { isSandbox } from "@/lib/env";

/**
 * Sandbox-only: sign in as a demo user with one tap. Disabled the moment DATABASE_URL is set.
 * /demo            -> Josh, organiser of Tuesday FC
 * /demo?as=member  -> Priya, a member
 */
export async function GET(req: Request) {
  if (!isSandbox()) return new NextResponse("Not found", { status: 404 });
  const as = new URL(req.url).searchParams.get("as");
  const db = await getDb();
  const email = as === "member" ? null : "josh@example.com";
  const user = email
    ? (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0]
    : (await db.select().from(schema.users).where(eq(schema.users.name, "Priya Shah")).limit(1))[0];
  if (!user) return new NextResponse("Demo data missing", { status: 500 });
  await endSession();
  await startSession(user.id);
  const url = new URL("/crew/tuesday-fc", req.url);
  return NextResponse.redirect(url, { status: 303 });
}
