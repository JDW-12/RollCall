import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { getSessionBundle } from "@/lib/queries";
import { canSeeSession } from "@/domain/visibility";
import type { StablefordCard } from "@/domain/stableford";
import { courseGeo } from "@/lib/course-geo";
import { LiveRound } from "@/components/golf/live-round";

export const metadata: Metadata = { title: "Play" };

/**
 * Play mode for a golf round: GPS distances on a satellite map and hole-by-hole scoring. The course's
 * holes and greens come from OpenStreetMap the first time it's played (see lib/course-geo); the map
 * needs a MapTiler key in MAPTILER_KEY, and without one the distances still work.
 */
export default async function LivePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const bundle = await getSessionBundle(id);
  if (!bundle || bundle.session.crewId !== crew.id || !canSeeSession(bundle.session, { id: user.id, isOrganiser })) notFound();
  const back = `/crew/${slug}/s/${id}`;
  const game = bundle.games.find((g) => g.kind === "stableford");
  if (!game) redirect(back);
  const card = JSON.parse(game.data) as StablefordCard;
  const geo = card.course?.id ? await courseGeo(card.course.id, bundle.session.venueAddress) : null;
  return (
    <LiveRound
      sessionId={id}
      backHref={back}
      courseName={card.course?.name ?? bundle.session.venueName ?? bundle.session.title}
      holes={card.holes}
      strokes={card.strokes[user.id] ?? []}
      handicap={card.handicaps[user.id] ?? 0}
      geo={geo?.status === "ok" ? geo.holes : null}
      center={geo?.center ?? null}
      mapKey={mapKey()}
    />
  );
}

/** The MapTiler key, under whichever name it was saved as in the hosting settings. */
function mapKey(): string | null {
  const k = process.env.MAPTILER_KEY ?? process.env.NEXT_PUBLIC_MAPTILER_KEY ?? process.env.MAPTILER_API_KEY ?? process.env.MAP_TILER_KEY;
  return k?.trim() || null;
}
