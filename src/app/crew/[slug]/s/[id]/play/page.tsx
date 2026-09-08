import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { getSessionBundle, listMembers } from "@/lib/queries";
import { playing, reserves } from "@/domain/rsvp";
import { toRows } from "@/components/session-card";
import { CrewShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { IconAlert, IconCheck } from "@/components/icons";
import { Eyebrow, Notice, PageTitle, Pill } from "@/components/ui";
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
      <ActionForm action={confirmPlayed} className="max-w-md mt-4 pb-20 sm:pb-0">
        <input type="hidden" name="sessionId" value={session.id} />
        <Group title="In" count={inRows.length}>
          {inRows.map((r) => {
            const m = name(r.userId);
            return m ? <Tile key={r.userId} id={r.userId} label={m.name} hue={m.hue} checked={prev.get(r.userId) ?? true} /> : null;
          })}
        </Group>
        {reserveRows.length ? (
          <Group title="Reserves" count={reserveRows.length} hint="Tick anyone who ended up playing.">
            {reserveRows.map((r) => {
              const m = name(r.userId);
              return m ? <Tile key={r.userId} id={r.userId} label={m.name} hue={m.hue} checked={prev.get(r.userId) ?? false} /> : null;
            })}
          </Group>
        ) : null}
        {others.length ? (
          <details className="surface overflow-hidden anim-rise-3">
            <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-3 list-none">
              <span className="flex flex-col">
                <span className="eyebrow">Walk-ons</span>
                <span className="text-sm text-ink-2">{others.length} others in the crew</span>
              </span>
              <span className="display text-lg font-bold tnum text-ink-3">{others.length}</span>
            </summary>
            <div className="px-3 pb-3 flex flex-col gap-2">
              {others.map((m) => (
                <Tile key={m.id} id={m.id} label={m.name} hue={m.hue} checked={prev.get(m.id) ?? false} />
              ))}
            </div>
          </details>
        ) : null}
        {lateDrops.length ? (
          <div className="flex items-start gap-2.5 rounded-md border border-card/50 bg-card-soft text-card-ink px-3 py-3 text-sm font-semibold">
            <IconAlert size={18} className="shrink-0 mt-px" />
            <span>Late drops still owing a share: {lateDrops.map((r) => name(r.userId)?.name.split(" ")[0]).filter(Boolean).join(", ")}.</span>
          </div>
        ) : null}
        <p className="text-sm text-ink-2">
          {session.costPence > 0
            ? session.costMode === "total"
              ? `${pounds(session.costPence)} booking, split between everyone who owes.`
              : `${pounds(session.costPence)} per head.`
            : "Free session. Only the table updates."}
        </p>
        <div className="fixed inset-x-0 bottom-[76px] z-10 px-4 pt-2 pb-2 bg-ground/90 backdrop-blur-md sm:static sm:inset-auto sm:p-0 sm:bg-transparent sm:backdrop-blur-none">
          <SubmitButton pendingText="Saving…" className="min-h-14 w-full text-base">
            Confirm and go to ratings
          </SubmitButton>
        </div>
      </ActionForm>
    </CrewShell>
  );
}

function Group({ title, count, hint, children }: { title: string; count: number; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="surface p-3 flex flex-col gap-2 anim-rise-2">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center justify-between px-1">
        <span className="flex flex-col">
          <Eyebrow>{title}</Eyebrow>
          {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
        </span>
        <span className="display text-lg font-bold tnum text-ink-3">{count}</span>
      </div>
      {children}
    </fieldset>
  );
}

/** A large toggle tile: the whole row is the tap target, the check fills pitch when ticked. */
function Tile({ id, label, hue, checked }: { id: string; label: string; hue: number; checked: boolean }) {
  return (
    <label className="group press relative flex items-center gap-3 min-h-14 px-3 rounded-md border border-line bg-panel-2 cursor-pointer has-checked:border-pitch has-checked:bg-pitch-soft has-focus-visible:outline-2 has-focus-visible:outline-pitch">
      <input type="checkbox" name="attended" value={id} defaultChecked={checked} className="sr-only" />
      <Avatar name={label} hue={hue} size={36} />
      <span className="font-semibold flex-1 truncate">{label}</span>
      {!checked ? <Pill tone="bad">no-show if unticked</Pill> : null}
      <span className="w-8 h-8 rounded-full border-2 border-line inline-flex items-center justify-center text-transparent shrink-0 group-has-checked:bg-pitch group-has-checked:border-pitch group-has-checked:text-pitch-ink" aria-hidden="true">
        <IconCheck size={18} strokeWidth={3} />
      </span>
    </label>
  );
}
