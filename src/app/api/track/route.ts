import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { track, type EventKind } from "@/lib/events";

const allowed: EventKind[] = ["share_click"];

/** Client-side beacon for share clicks. Anything else is ignored. */
export async function POST(req: Request) {
  let body: { kind?: string; crewId?: string; sessionId?: string; what?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.kind || !allowed.includes(body.kind as EventKind)) return NextResponse.json({ ok: false }, { status: 400 });
  const user = await getCurrentUser();
  await track(body.kind as EventKind, { crewId: body.crewId ?? null, sessionId: body.sessionId ?? null, userId: user?.id ?? null, payload: { what: String(body.what ?? "").slice(0, 40) } });
  return NextResponse.json({ ok: true });
}
