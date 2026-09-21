import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { courseApiConfigured, searchCourses } from "@/lib/golf-courses";
import { allow } from "@/lib/ratelimit";

/** Golf course cards by name: our library first, then the provider when configured. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ hits: [] }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  if (q.trim().length < 2) return NextResponse.json({ hits: [], provider: courseApiConfigured() });
  if (!(await allow("course_search", user.id, 120, 60 * 60_000))) return NextResponse.json({ hits: [], error: "Slow down a little." }, { status: 429 });
  const hits = await searchCourses(q);
  return NextResponse.json({ hits, provider: courseApiConfigured() }, { headers: { "Cache-Control": "private, max-age=120" } });
}
