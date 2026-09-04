import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { CrewShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SessionFields } from "@/components/session-form";
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
      <ActionForm action={createSession} className="max-w-md">
        <input type="hidden" name="crewId" value={crew.id} />
        <SessionFields defaultSport={isSportKey(crew.sport) ? crew.sport : "football"} crewLateDropHours={crew.lateDropHours} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="organiserIn" value="yes" defaultChecked />
          Count me in
        </label>
        <SubmitButton pendingText="Pinning…">Pin it</SubmitButton>
      </ActionForm>
    </CrewShell>
  );
}
