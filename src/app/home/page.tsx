import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCrewsForUser } from "@/lib/queries";
import { crewSummaries } from "@/lib/dashboard";
import { nextUp, overallStats, type CrewSummary, type RsvpState } from "@/domain/dashboard";
import { sportOf } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { IconCalendar, IconWhistle, SportIcon } from "@/components/icons";
import { FlagEmblem } from "@/components/golf/marks";
import { Eyebrow, LinkButton, Panel, Pill, cls } from "@/components/ui";
import { fmtDateTime, fmtTime, fmtToPar, plural, relativeDay } from "@/lib/format";

export const metadata: Metadata = { title: "Your dashboard" };

/**
 * The personal dashboard: your numbers from every crew, whatever the sport, what's next across all
 * of them, and a card per crew that takes you in. Every crew's header icon leads back here.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/home");
  const crews = await listCrewsForUser(user.id);
  const summaries = await crewSummaries(user, crews);
  const o = overallStats(summaries);
  const upcoming = nextUp(summaries);

  return (
    <PlainShell user={user} wide>
      <section className="relative overflow-hidden surface surface-raised p-5 sm:p-6 anim-rise" aria-label="You">
        <div className="absolute inset-0 pitch-lines opacity-60" aria-hidden="true" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(520px 220px at 10% 0%, oklch(0.55 0.14 ${user.hue} / 0.35), transparent 70%)` }} aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={user.name} hue={user.hue} size={64} />
            <div className="min-w-0">
              <Eyebrow>Your dashboard</Eyebrow>
              <h1 className="text-[40px] sm:text-[52px] font-extrabold uppercase leading-[0.9] wrap-anywhere">Hello, {user.name.split(" ")[0]}</h1>
              <p className="text-sm text-ink-2 mt-1">
                {plural(o.crews, "crew")} · {o.played} played{o.turnUpRate !== null ? ` · ${o.turnUpRate}% turn-up` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <LinkButton href="/start" variant="secondary">
              New crew
            </LinkButton>
            <LinkButton href="/me" variant="ghost">
              Account
            </LinkButton>
          </div>
        </div>
      </section>

      {crews.length === 0 ? (
        <div className="surface p-8 mt-6 flex flex-col items-center text-center gap-3 anim-rise-2">
          <span className="w-16 h-16 rounded-full bg-pitch-soft text-pitch flex items-center justify-center">
            <IconWhistle size={32} />
          </span>
          <div className="display text-2xl font-bold uppercase">No crews yet</div>
          <p className="text-ink-2 max-w-[40ch]">Start one and share the link, or open the invite link your organiser sent.</p>
          <LinkButton href="/start">Start a crew</LinkButton>
        </div>
      ) : (
        <>
          <section className="mt-6 anim-rise-2" aria-label="Your stats">
            <Eyebrow>Across every crew</Eyebrow>
            <h2 className="text-2xl font-bold uppercase mb-3">Your stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
              <Tile label="Played" value={o.played} sub={`sessions and rounds, ${plural(o.crews, "crew")}`} />
              <Tile label="Turn-up" value={o.turnUpRate === null ? "–" : `${o.turnUpRate}%`} sub="of spots you held" tone={o.turnUpRate !== null && o.turnUpRate >= 85 ? "good" : undefined} />
              <Tile label="Best streak" value={o.bestStreak} sub="in a row" />
              <Tile label="Votes" value={o.votes} sub="from your crews" />
              {o.goals || o.assists ? <Tile label="Goals · assists" value={`${o.goals} · ${o.assists}`} sub="in fixtures" /> : null}
              {o.golfBest ? <Tile label="Best round" value={fmtToPar(o.golfBest.toPar)} sub={o.golfBest.crew} tone="good" /> : null}
            </div>
          </section>

          {upcoming.length ? (
            <section className="mt-8 anim-rise-2" aria-label="Next up">
              <Eyebrow>Coming up</Eyebrow>
              <h2 className="text-2xl font-bold uppercase mb-3">Next up</h2>
              <ol className="flex flex-col gap-2">
                {upcoming.map((n) => (
                  <li key={n.id}>
                    <Link href={`/crew/${n.crew.slug}/s/${n.id}`} className="surface press flex items-center gap-3 p-3 hover:border-ink-3">
                      <span className="w-20 shrink-0 text-center leading-tight">
                        <span className="block eyebrow">{relativeDay(new Date(n.startsAt))}</span>
                        <span className="block display text-xl font-bold tnum">{fmtTime(new Date(n.startsAt))}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold truncate">{n.title}</span>
                        <span className="flex items-center gap-1.5 text-xs text-ink-3 min-w-0">
                          <SportIcon sport={n.crew.sport} size={13} />
                          <span className="truncate">
                            {n.crew.name}
                            {n.venueName ? ` · ${n.venueName}` : ""}
                          </span>
                        </span>
                      </span>
                      <Answer mine={n.mine} />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="mt-8 anim-rise-3" aria-label="Your crews">
            <Eyebrow>Tap one to go in</Eyebrow>
            <h2 className="text-2xl font-bold uppercase mb-3">Your crews</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summaries.map((c) => (
                <CrewCard key={c.crewId} c={c} />
              ))}
            </div>
          </section>
        </>
      )}
    </PlainShell>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "good" }) {
  return (
    <Panel className="p-3 flex flex-col gap-0.5 min-w-0">
      <span className="eyebrow">{label}</span>
      <span className={cls("display text-[30px] font-bold leading-none tnum", tone === "good" ? "text-pitch" : "text-ink")}>{value}</span>
      {sub ? <span className="text-xs text-ink-3 truncate">{sub}</span> : null}
    </Panel>
  );
}

function Answer({ mine }: { mine: RsvpState }) {
  if (mine === "in") return <Pill tone="good">You&apos;re in</Pill>;
  if (mine === "reserve") return <Pill tone="warn">Reserve</Pill>;
  if (mine === "out") return <Pill>Out</Pill>;
  return <Pill tone="warn">Not answered</Pill>;
}

/**
 * One crew as a card in its sport's colours: golf on the fairway with the flag, everyone else in the
 * crew's own colour over pitch lines. Your place, points and card number, and the next session.
 */
function CrewCard({ c }: { c: CrewSummary }) {
  const sport = sportOf(c.sport);
  const golf = c.sport === "golf";
  const best = c.golf?.bestToPar;
  return (
    <Link
      href={`/crew/${c.slug}`}
      className={cls("surface surface-raised press relative overflow-hidden rounded-lg min-h-[210px] p-4 flex flex-col justify-between gap-4 hover:border-ink-3", golf && "golf")}
      aria-label={`${c.name}, ${sport.label}`}
    >
      {golf ? (
        <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, color-mix(in oklab, var(--gf-fairway) 55%, var(--panel)) 0%, var(--panel) 75%)" }} aria-hidden="true" />
          <div className="absolute inset-0 fairway-lines" aria-hidden="true" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 pitch-lines" aria-hidden="true" />
          <div className="absolute inset-0" style={{ background: `radial-gradient(420px 200px at 15% 0%, oklch(0.5 0.15 ${c.hue} / 0.45), transparent 70%)` }} aria-hidden="true" />
        </>
      )}
      <span className="absolute -right-4 -bottom-5 text-ink opacity-[0.07]" aria-hidden="true">
        <SportIcon sport={c.sport} size={150} />
      </span>

      <div className="relative flex items-start justify-between gap-3">
        <span className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 text-ink" style={{ background: golf ? "rgba(0,0,0,0.18)" : `oklch(0.45 0.13 ${c.hue} / 0.6)` }}>
          {golf ? <FlagEmblem size={24} /> : <SportIcon sport={c.sport} size={20} />}
        </span>
        <Pill tone={c.role === "organiser" ? "good" : "neutral"}>{c.role}</Pill>
      </div>

      <div className="relative flex flex-col gap-1">
        <span className="display text-[30px] font-extrabold uppercase leading-[0.92] wrap-anywhere">{c.name}</span>
        <span className="eyebrow">{sport.label}</span>
      </div>

      <dl className="relative grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: "color-mix(in oklab, var(--ink) 12%, transparent)" }}>
        <div>
          <dt className="eyebrow">Place</dt>
          <dd className="display text-2xl font-bold tnum leading-none mt-0.5">{c.rank ? `#${c.rank}` : "–"}</dd>
          <dd className="text-[11px] text-ink-3">of {c.of}</dd>
        </div>
        <div>
          <dt className="eyebrow">Points</dt>
          <dd className="display text-2xl font-bold tnum leading-none mt-0.5">{c.points}</dd>
        </div>
        {golf ? (
          <div>
            <dt className="eyebrow">Best</dt>
            <dd className="display text-2xl font-bold tnum leading-none mt-0.5">{best === null || best === undefined ? "–" : fmtToPar(best)}</dd>
            <dd className="text-[11px] text-ink-3">{plural(c.golf?.rounds ?? 0, "round")}</dd>
          </div>
        ) : (
          <div>
            <dt className="eyebrow">Card</dt>
            {/* A card number means something once you've played; before that it's just the starting value. */}
            <dd className="display text-2xl font-bold tnum leading-none mt-0.5">{c.played && c.rating ? c.rating : "–"}</dd>
          </div>
        )}
      </dl>

      <div className="relative flex items-center justify-between gap-2 text-sm">
        <span className={cls("inline-flex items-center gap-1.5 min-w-0", c.next ? "text-ink-2" : "text-ink-3")}>
          <IconCalendar size={15} className="shrink-0" />
          <span className="truncate">{c.next ? `${fmtDateTime(new Date(c.next.startsAt))} · ${c.next.title}` : "Nothing pinned"}</span>
        </span>
        {c.next ? <Answer mine={c.next.mine} /> : null}
      </div>
    </Link>
  );
}
