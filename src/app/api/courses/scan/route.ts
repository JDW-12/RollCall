import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CourseError } from "@/domain/courses";
import { scanConfigured, scanScorecard } from "@/lib/scan-card";
import { allow } from "@/lib/ratelimit";

/** Vercel rejects request bodies over 4.5 MB before the function runs; the picker shrinks photos client-side to stay well under. */
const MAX_BYTES = 4 * 1024 * 1024;

/** Photo of a paper scorecard in, course card out for the organiser to confirm. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!scanConfigured()) return NextResponse.json({ error: "Scanning isn't switched on." }, { status: 503 });
  let file: File | null = null;
  try {
    const fd = await req.formData();
    const f = fd.get("image");
    if (f instanceof File) file = f;
  } catch {
    /* fall through */
  }
  if (!file || file.size === 0) return NextResponse.json({ error: "Choose a photo of the card." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That photo is over 4 MB. Take a smaller one." }, { status: 413 });
  if (!(await allow("course_scan", user.id, 20, 24 * 60 * 60_000))) return NextResponse.json({ error: "That's plenty of scans for one day. Type the card in instead." }, { status: 429 });
  try {
    const result = await scanScorecard(new Uint8Array(await file.arrayBuffer()), file.type);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof CourseError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("scorecard scan failed", e);
    return NextResponse.json({ error: "Couldn't read that card just now. Try again in a minute." }, { status: 502 });
  }
}
