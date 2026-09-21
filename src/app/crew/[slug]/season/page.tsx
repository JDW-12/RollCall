import type { Metadata } from "next";
import Link from "next/link";
import { optionalCrewPage } from "@/lib/access";
import { getCrewTable } from "@/lib/queries";
import { seasonAwards } from "@/domain/awards";
import { ratingsFor } from "@/domain/ratings";
import { appUrl } from "@/lib/env";
import { track } from "@/lib/events";
import { CrewShell, PlainShell } from "@/components/shell";
import { PreviewActions } from "@/components/previews";
import { ShareButtons } from "@/components/share";
import { Avatar } from "@/components/avatar";
import { EmptyState, LinkButton, Panel, cls } from "@/components/ui";
import { IconAlert, IconBolt, IconFlame, IconMedal, IconTrophy, IconWhistle } from "@/components/icons";
import type { ReactNode } from "react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Season awards · ${slug.replace(/-/g, " ")}` };
}

const ICONS: Record<string, ReactNode> = {
  champion: <IconTrophy size={20} />,
  player: <IconMedal size={20} />,
  iron: <IconBolt size={20} />,
  streak: <IconFlame size={20} />,
  grafter: <IconWhistle size={20} />,
  sicknote: <IconAlert size={20} />,
  banter: <IconWhistle size={20} />,
};

export default async function SeasonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await optionalCrewPage(slug);
  const { crew } = gate;
  const { rows, members } = await getCrewTable(crew);
  const awards = seasonAwards(rows, ratingsFor(crew.sport, crew.ratings), 1);
  const played = rows.reduce((t, r) => t + r.played, 0);
  const url = `${await appUrl()}/crew/${crew.slug}/season`;
  const name = (id: string) => members.find((m) => m.id === id);
  if (!gate.member) await track("preview_view", { crewId: crew.id, userId: gate.user?.id ?? null, payload: { what: "season" } });

  const body = (
    <div className="flex flex-col gap-5">
      <header className="anim-rise">
        <div className="eyebrow">
          {crew.name} · {crew.seasonName}
        </div>
        <h1 className="text-[48px] sm:text-[64px] font-extrabold uppercase leading-[0.9]">Season awards</h1>
        <p className="text-ink-2 mt-2 max-w-[48ch]">Decided by turning up and by the votes of the people who were actually there. {played} appearances so far.</p>
      </header>
      {awards.length === 0 ? (
        <EmptyState title="No awards yet" body="The first confirmed session starts the count." action={gate.member ? <LinkButton href={`/crew/${crew.slug}`}>Back to the crew</LinkButton> : undefined} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {awards.map((a, i) => {
            const m = name(a.userId);
            if (!m) return null;
            const wash = a.tone === "pitch" ? "bg-pitch-soft border-pitch/40" : a.tone === "card" ? "bg-card-soft border-card/40" : a.tone === "red" ? "bg-red-soft border-red/40" : "bg-panel-2 border-line";
            const ink = a.tone === "pitch" ? "text-pitch" : a.tone === "card" ? "text-card-ink" : a.tone === "red" ? "text-red" : "text-ink";
            return (
              <Panel key={a.key} className={cls("p-4 flex flex-col gap-3 border", wash, i === 0 && "sm:col-span-2", i < 3 ? "anim-rise" : "anim-rise-2")}>
                <div className="flex items-center justify-between">
                  <span className={cls("eyebrow flex items-center gap-1.5", ink)}>
                    {ICONS[a.key]} {a.label}
                  </span>
                  <span className={cls("display text-2xl font-bold tnum", ink)}>
                    {a.value} <span className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-80">{a.unit}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} hue={m.hue} size={i === 0 ? 64 : 48} className="ring-2 ring-panel" />
                  <div className="min-w-0">
                    <Link href={`/crew/${crew.slug}/players/${m.id}`} className={cls("display font-extrabold uppercase leading-none block truncate", i === 0 ? "text-4xl" : "text-2xl")}>
                      {m.name}
                    </Link>
                    <p className="text-sm text-ink-2 mt-1">{a.blurb}</p>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      {gate.member ? (
        <ShareButtons text={`${crew.name} ${crew.seasonName} awards. ${awards[0] ? `${awards[0].label}: ${name(awards[0].userId)?.name}.` : ""}`} url={url} label="Share the awards" crewId={crew.id} what="season" />
      ) : (
        <PreviewActions crew={crew} primary="start" />
      )}
    </div>
  );
  return gate.member ? (
    <CrewShell crew={crew} user={gate.member.user} active="table">
      {body}
    </CrewShell>
  ) : (
    <PlainShell user={gate.user}>
      <div className="max-w-2xl mx-auto">{body}</div>
    </PlainShell>
  );
}
