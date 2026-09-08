import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCrewsForUser, getNextSession } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { IconCalendar, IconWhistle, SportIcon } from "@/components/icons";
import { LinkButton, PageTitle, Pill, cls } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Your crews" };

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/home");
  const crews = await listCrewsForUser(user.id);
  const withNext = await Promise.all(crews.map(async (c) => ({ crew: c, next: await getNextSession(c.id) })));
  return (
    <PlainShell user={user}>
      <PageTitle eyebrow={`Hello ${user.name}`} title="Your crews" action={<LinkButton href="/start" variant="secondary">New crew</LinkButton>} />
      {withNext.length === 0 ? (
        <div className="surface p-8 flex flex-col items-center text-center gap-3 anim-rise">
          <span className="w-16 h-16 rounded-full bg-pitch-soft text-pitch flex items-center justify-center">
            <IconWhistle size={32} />
          </span>
          <div className="display text-2xl font-bold uppercase">No crews yet</div>
          <p className="text-ink-2 max-w-[40ch]">Start one and share the link, or ask your organiser for theirs.</p>
          <LinkButton href="/start">Start a crew</LinkButton>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {withNext.map(({ crew, next }, i) => {
            const sport = sportOf(crew.sport);
            return (
              <Link
                key={crew.id}
                href={`/crew/${crew.slug}`}
                className={cls("surface surface-raised press relative overflow-hidden rounded-lg min-h-[168px] p-4 flex flex-col justify-between hover:border-ink-3", i === 0 ? "anim-rise" : i === 1 ? "anim-rise-2" : "anim-rise-3")}
              >
                <div className="absolute inset-0 pitch-lines" aria-hidden="true" />
                <div className="absolute inset-0" style={{ background: `radial-gradient(420px 200px at 15% 0%, oklch(0.5 0.15 ${crew.hue} / 0.45), transparent 70%)` }} aria-hidden="true" />
                <span className="absolute -right-4 -bottom-5 text-ink opacity-[0.07]" aria-hidden="true">
                  <SportIcon sport={crew.sport} size={150} />
                </span>
                <div className="relative flex items-start justify-between gap-3">
                  <span className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 text-ink" style={{ background: `oklch(0.45 0.13 ${crew.hue} / 0.6)` }}>
                    <SportIcon sport={crew.sport} size={20} />
                  </span>
                  <Pill tone={crew.role === "organiser" ? "good" : "neutral"}>{crew.role}</Pill>
                </div>
                <div className="relative flex flex-col gap-1.5 mt-6">
                  <span className="display text-[32px] font-extrabold uppercase leading-[0.92] wrap-anywhere">{crew.name}</span>
                  <span className="eyebrow">
                    {sport.label} · {crew.city}
                  </span>
                  <span className={cls("inline-flex items-center gap-1.5 text-sm mt-1", next ? "text-ink-2" : "text-ink-3")}>
                    <IconCalendar size={15} />
                    {next ? `Next: ${fmtDateTime(next.startsAt)}` : "Nothing pinned"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PlainShell>
  );
}
