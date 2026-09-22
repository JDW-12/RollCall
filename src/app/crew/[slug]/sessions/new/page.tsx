import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { CrewShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SessionFields } from "@/components/session-form";
import { listCompetitions, venueHistory } from "@/lib/queries";
import { venueSuggestions } from "@/domain/venues";
import { IconCheck } from "@/components/icons";
import { PageTitle } from "@/components/ui";
import { createSession } from "@/lib/actions/session";
import { isSportKey } from "@/domain/sports";

export const metadata: Metadata = { title: "Pin a session" };

export default async function NewSessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  if (!isOrganiser) redirect(`/crew/${slug}`);
  return (
    <CrewShell crew={crew} user={user} active="sessions">
      <PageTitle eyebrow="Under a minute" title="Pin a session">
        You&apos;re in by default. Everyone else gets the link.
      </PageTitle>
      <ActionForm action={createSession} className="max-w-md" marker="session-form">
        <input type="hidden" name="crewId" value={crew.id} />
        <SessionFields defaultSport={isSportKey(crew.sport) ? crew.sport : "football"} crewLateDropHours={crew.lateDropHours} venues={venueSuggestions(isSportKey(crew.sport) ? crew.sport : "football", await venueHistory(crew.id))} competitions={await listCompetitions(crew.id)} />
        <label className="group press flex items-center gap-3 rounded-md border border-line bg-panel-2 px-3 min-h-12 cursor-pointer has-checked:border-pitch has-checked:bg-pitch-soft">
          <input type="checkbox" name="organiserIn" value="yes" defaultChecked className="sr-only" />
          <span className="w-7 h-7 rounded-full border-2 border-line inline-flex items-center justify-center text-transparent shrink-0 group-has-checked:bg-pitch group-has-checked:border-pitch group-has-checked:text-pitch-ink" aria-hidden="true">
            <IconCheck size={16} strokeWidth={3} />
          </span>
          <span className="text-sm font-semibold">Count me in</span>
        </label>
        <SubmitButton pendingText="Pinning…" className="min-h-14 text-base">
          Pin it
        </SubmitButton>
      </ActionForm>
    </CrewShell>
  );
}
