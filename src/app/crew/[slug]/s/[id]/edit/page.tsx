import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { getSession, listCompetitions, listMembers } from "@/lib/queries";
import { CrewShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SessionFields } from "@/components/session-form";
import { venueHistory } from "@/lib/queries";
import { venueSuggestions } from "@/domain/venues";
import { Button, Eyebrow, PageTitle } from "@/components/ui";
import { cancelSession, deleteSession, updateSession } from "@/lib/actions/session";
import { isSportKey, sportOf } from "@/domain/sports";

export const metadata: Metadata = { title: "Edit session" };

export default async function EditSessionPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const session = await getSession(id);
  if (!session || session.crewId !== crew.id) notFound();
  if (!isOrganiser) redirect(`/crew/${slug}/s/${id}`);
  const sportKey = isSportKey(crew.sport) ? crew.sport : "football";
  const noun = sportOf(session.sport).noun;
  const played = session.status === "played";
  // Whoever pinned it is always on it, so they aren't offered as a tick box.
  const others = (await listMembers(crew.id)).filter((m) => m.id !== session.createdBy).map(({ id, name, hue }) => ({ id, name, hue }));
  return (
    <CrewShell crew={crew} user={user} active="sessions">
      <PageTitle eyebrow="Organiser" title={`Edit ${noun}`}>
        {played ? "Change the title, time, venue, notes or who it's for. Spots and cost stay as they were settled." : "Adding spots promotes people off the reserve list automatically."}
      </PageTitle>
      {session.status === "cancelled" ? (
        <p className="text-sm text-ink-2 max-w-md mb-4">This one was cancelled, so there&apos;s nothing to edit. You can still delete it below.</p>
      ) : (
        <ActionForm action={updateSession} className="max-w-md" marker="session-form">
          <input type="hidden" name="sessionId" value={session.id} />
          <SessionFields defaultSport={sportKey} session={session} crewLateDropHours={crew.lateDropHours} venues={venueSuggestions(sportKey, await venueHistory(crew.id))} competitions={await listCompetitions(crew.id)} members={others} locked={played} />
          <SubmitButton pendingText="Saving…" className="min-h-14 text-base">
            Save changes
          </SubmitButton>
        </ActionForm>
      )}

      <section className="mt-8 max-w-md rounded-md border border-red/30 bg-red-soft p-4 flex flex-col gap-5" aria-label="Danger zone">
        <Eyebrow className="text-red">Danger zone</Eyebrow>
        {session.status === "open" ? (
          <form action={cancelSession} className="flex flex-col gap-2">
            <input type="hidden" name="sessionId" value={session.id} />
            <p className="text-sm text-ink-2">
              <strong className="text-ink">Cancel</strong> keeps it on record but nobody is charged and nothing counts against anyone.
            </p>
            <Button type="submit" variant="secondary" className="self-start">
              Cancel this {noun}
            </Button>
          </form>
        ) : null}
        <ActionForm action={deleteSession}>
          <input type="hidden" name="sessionId" value={session.id} />
          <p className="text-sm text-ink-2">
            <strong className="text-ink">Delete</strong> removes it for everyone: who was in, {played ? "attendance, votes, scores and the charges it raised" : "and anything entered so far"}. It comes off the table too. This can&apos;t be undone.
          </p>
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input type="checkbox" name="confirm" value="yes" required />
            Yes, delete this {noun} for everyone
          </label>
          <SubmitButton variant="danger" pendingText="Deleting…" className="self-start">
            Delete {noun}
          </SubmitButton>
        </ActionForm>
      </section>
    </CrewShell>
  );
}
