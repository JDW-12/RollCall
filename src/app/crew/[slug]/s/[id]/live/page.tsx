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
export default async function LivePage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ refresh?: string }> }) {
  const { slug, id } = await params;
  const { refresh } = await searchParams;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const bundle = await getSessionBundle(id);
  if (!bundle || bundle.session.crewId !== crew.id || !canSeeSession(bundle.session, { id: user.id, isOrganiser })) notFound();
  const back = `/crew/${slug}/s/${id}`;
  const game = bundle.games.find((g) => g.kind === "stableford");
  if (!game) redirect(back);
  const card = JSON.parse(game.data) as StablefordCard;
  // An organiser can ask for the course's hole positions to be looked up again straight away.
  const geo = card.course?.id ? await courseGeo(card.course.id, bundle.session.venueAddress, { force: isOrganiser && refresh === "1" }) : null;
  const name = card.course?.name ?? "This course";
  const whyNoMap =
    geo?.status === "ok"
      ? null
      : !card.course?.id
        ? "this round's card isn't linked to the course library, so hole positions aren't known. Re-pick the course from the search to link it."
        : geo?.status === "none" && geo.reason === "no-holes"
          ? `${name}'s holes aren't on OpenStreetMap yet${geo.found?.greens ? ` (only ${geo.found.greens === 1 ? "1 green is" : `${geo.found.greens} greens are`})` : ""}. Tap the green on the map to measure.`
          : `couldn't place ${name} on the map just now.`;
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
      mapHelp={
        // Organisers only, names only (never values): which map-ish settings this deployment can see,
        // so a key saved under another name, environment or project is obvious.
        isOrganiser && !mapKey()
          ? `Looked for MAPTILER_KEY on this deployment (${process.env.VERCEL_ENV ?? "local"}). Settings it can see with "map" in the name: ${Object.keys(process.env).filter((k) => /map|tiler/i.test(k)).join(", ") || "none"}.`
          : null
      }
      whyNoMap={whyNoMap}
      retryHref={isOrganiser && card.course?.id && geo?.status !== "ok" ? `/crew/${slug}/s/${id}/live?refresh=1` : null}
    />
  );
}

/** The MapTiler key, under whichever name it was saved as in the hosting settings. */
function mapKey(): string | null {
  const k = process.env.MAPTILER_KEY ?? process.env.NEXT_PUBLIC_MAPTILER_KEY ?? process.env.MAPTILER_API_KEY ?? process.env.MAP_TILER_KEY;
  return k?.trim() || null;
}
