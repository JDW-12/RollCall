import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { courseApiConfigured, searchCourses } from "@/lib/golf-courses";

/** Golf course cards by name: our library first, then the provider when configured. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ hits: [] }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  const hits = await searchCourses(q);
  return NextResponse.json({ hits, provider: courseApiConfigured() }, { headers: { "Cache-Control": "private, max-age=120" } });
}
