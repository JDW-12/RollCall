import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { getSessionBundle, listMembers } from "@/lib/queries";
import { playing, reserves } from "@/domain/rsvp";
import { toRows } from "@/components/session-card";
import { CrewShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { Notice, PageTitle, Pill } from "@/components/ui";
import { confirmPlayed } from "@/lib/actions/session";
import { pounds } from "@/lib/format";

export const metadata: Metadata = { title: "Who turned up?" };

export default async function PlayPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const bundle = await getSessionBundle(id);
  if (!bundle || bundle.session.crewId !== crew.id) notFound();
  if (!isOrganiser) redirect(`/crew/${slug}/s/${id}`);
  const { session, rsvps, attendance } = bundle;
  const members = await listMembers(crew.id);
  const rows = toRows(rsvps);
  const inRows = playing(rows);
  const reserveRows = reserves(rows);
  const others = members.filter((m) => !inRows.some((r) => r.userId === m.id) && !reserveRows.some((r) => r.userId === m.id));
  const prev = new Map(attendance.map((a) => [a.userId, a.attended]));
  const lateDrops = rsvps.filter((r) => r.lateDrop);
  const name = (uid: string) => members.find((m) => m.id === uid);

  return (
    <CrewShell crew={crew} user={user} active="sessions">
      <PageTitle eyebrow={session.title} title="Who turned up?">
        Tick everyone who played. Unticked people who were in count as no-shows and still owe their share.
      </PageTitle>
      {session.status === "played" ? <Notice tone="neutral">Already confirmed. Saving again replaces attendance and rebuilds this session&apos;s charges. Payments already recorded are kept.</Notice> : null}
      <ActionForm action={confirmPlayed} className="max-w-md mt-4">
        <input type="hidden" name="sessionId" value={session.id} />
        <Group title={`In (${inRows.length})`}>
          {inRows.map((r) => {
            const m = name(r.userId);
            return m ? <Row key={r.userId} id={r.userId} label={m.name} hue={m.hue} checked={prev.get(r.userId) ?? true} /> : null;
          })}
        </Group>
        {reserveRows.length ? (
          <Group title="Reserves who ended up playing">
            {reserveRows.map((r) => {
              const m = name(r.userId);
              return m ? <Row key={r.userId} id={r.userId} label={m.name} hue={m.hue} checked={prev.get(r.userId) ?? false} /> : null;
            })}
          </Group>
        ) : null}
        {others.length ? (
          <details className="border border-line rounded-md">
            <summary className="px-3 py-2.5 text-sm font-semibold cursor-pointer">Walk-ons ({others.length} others in the crew)</summary>
            <div className="px-3 pb-3 flex flex-col gap-1">
              {others.map((m) => (
                <Row key={m.id} id={m.id} label={m.name} hue={m.hue} checked={prev.get(m.id) ?? false} />
              ))}
            </div>
          </details>
        ) : null}
        {lateDrops.length ? (
          <Notice tone="warn">
            Late drops still owing a share: {lateDrops.map((r) => name(r.userId)?.name.split(" ")[0]).filter(Boolean).join(", ")}.
          </Notice>
        ) : null}
        <p className="text-sm text-ink-2">
          {session.costPence > 0
            ? session.costMode === "total"
              ? `${pounds(session.costPence)} booking, split between everyone who owes.`
              : `${pounds(session.costPence)} per head.`
            : "Free session. Only the table updates."}
        </p>
        <SubmitButton pendingText="Saving…" className="min-h-12 text-base">
          Confirm and go to ratings
        </SubmitButton>
      </ActionForm>
    </CrewShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-line rounded-md p-3 flex flex-col gap-1">
      <legend className="eyebrow px-1">{title}</legend>
      {children}
    </fieldset>
  );
}

function Row({ id, label, hue, checked }: { id: string; label: string; hue: number; checked: boolean }) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer">
      <input type="checkbox" name="attended" value={id} defaultChecked={checked} />
      <Avatar name={label} hue={hue} size={28} />
      <span className="font-semibold">{label}</span>
      {!checked ? <Pill tone="bad">no-show if unticked</Pill> : null}
    </label>
  );
}
