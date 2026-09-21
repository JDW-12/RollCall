import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { getSession } from "@/lib/queries";
import { CrewShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SessionFields } from "@/components/session-form";
import { venueHistory } from "@/lib/queries";
import { venueSuggestions } from "@/domain/venues";
import { Button, Eyebrow, PageTitle } from "@/components/ui";
import { cancelSession, updateSession } from "@/lib/actions/session";
import { isSportKey } from "@/domain/sports";

export const metadata: Metadata = { title: "Edit session" };

export default async function EditSessionPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const session = await getSession(id);
  if (!session || session.crewId !== crew.id) notFound();
  if (!isOrganiser) redirect(`/crew/${slug}/s/${id}`);
  return (
    <CrewShell crew={crew} user={user} active="sessions">
      <PageTitle eyebrow="Organiser" title="Edit session">
        Adding spots promotes people off the reserve list automatically.
      </PageTitle>
      <ActionForm action={updateSession} className="max-w-md" marker="session-form">
        <input type="hidden" name="sessionId" value={session.id} />
        <SessionFields defaultSport={isSportKey(crew.sport) ? crew.sport : "football"} session={session} crewLateDropHours={crew.lateDropHours} venues={venueSuggestions(isSportKey(crew.sport) ? crew.sport : "football", await venueHistory(crew.id))} />
        <SubmitButton pendingText="Saving…" className="min-h-14 text-base">
          Save changes
        </SubmitButton>
      </ActionForm>
      {session.status === "open" ? (
        <form action={cancelSession} className="mt-8 max-w-md rounded-md border border-red/30 bg-red-soft p-4 flex flex-col gap-3">
          <input type="hidden" name="sessionId" value={session.id} />
          <Eyebrow className="text-red">Danger zone</Eyebrow>
          <p className="text-sm text-ink-2">Cancelling keeps the record but nobody is charged and nothing counts against anyone.</p>
          <Button type="submit" variant="danger" className="self-start">
            Cancel this session
          </Button>
        </form>
      ) : null}
    </CrewShell>
  );
}
