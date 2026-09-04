import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCrewsForUser, getNextSession } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { EmptyState, LinkButton, PageTitle, Panel, Pill } from "@/components/ui";
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
        <EmptyState title="No crews yet" body="Start one and share the link, or ask your organiser for their invite link." action={<LinkButton href="/start">Start a crew</LinkButton>} />
      ) : (
        <div className="grid gap-3">
          {withNext.map(({ crew, next }) => (
            <Link key={crew.id} href={`/crew/${crew.slug}`} className="block">
              <Panel className="p-4 flex items-center justify-between gap-3 hover:border-ink-3" as="div">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: `oklch(0.6 0.16 ${crew.hue})` }} aria-hidden />
                    <span className="display text-2xl font-bold uppercase truncate">{crew.name}</span>
                  </div>
                  <div className="text-sm text-ink-2 mt-0.5">
                    {sportOf(crew.sport).label} · {crew.city}
                    {next ? ` · Next: ${fmtDateTime(next.startsAt)}` : " · Nothing pinned"}
                  </div>
                </div>
                <Pill tone={crew.role === "organiser" ? "good" : "neutral"}>{crew.role}</Pill>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </PlainShell>
  );
}
