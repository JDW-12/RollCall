import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findMembership } from "@/lib/access";
import { findCrewByInvite, listMembers } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { EmptyState, Field, LinkButton, PageTitle } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { joinCrew } from "@/lib/actions/crew";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const crew = await findCrewByInvite(token);
  return { title: crew ? `Join ${crew.name}` : "Invite" };
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const crew = await findCrewByInvite(token);
  const user = await getCurrentUser();
  if (!crew) {
    return (
      <PlainShell user={user}>
        <EmptyState title="That link has expired" body="Ask the organiser for a fresh invite link." action={<LinkButton href="/">Home</LinkButton>} />
      </PlainShell>
    );
  }
  if (user && (await findMembership(crew.id, user.id))) redirect(`/crew/${crew.slug}`);
  const members = await listMembers(crew.id);
  const sport = sportOf(crew.sport);
  return (
    <PlainShell user={user}>
      <PageTitle eyebrow={`${sport.label} · ${crew.city}`} title={crew.name}>
        You&apos;ve been invited. {members.length} in the crew so far.
      </PageTitle>
      <div className="flex -space-x-2 mb-6">
        {members.slice(0, 10).map((m) => (
          <Avatar key={m.id} name={m.name} hue={m.hue} size={34} className="ring-2 ring-ground" />
        ))}
      </div>
      <ActionForm action={joinCrew} className="max-w-sm">
        <input type="hidden" name="token" value={token} />
        {user ? (
          <p className="text-sm text-ink-2">
            Joining as <strong>{user.name}</strong>.
          </p>
        ) : (
          <Field label="Your name" hint="No sign-up. This is all the crew needs.">
            <input name="name" required minLength={2} maxLength={40} autoComplete="given-name" placeholder="Priya" autoFocus />
          </Field>
        )}
        <SubmitButton pendingText="Joining…">Join {crew.name}</SubmitButton>
      </ActionForm>
    </PlainShell>
  );
}
