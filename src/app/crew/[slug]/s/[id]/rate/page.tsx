import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { getSessionBundle, listMembers } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { CrewShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { EmptyState, LinkButton, PageTitle } from "@/components/ui";
import { rate } from "@/lib/actions/session";

export const metadata: Metadata = { title: "Rate the session" };

export default async function RatePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { crew, user } = await requireCrewPage(slug);
  const bundle = await getSessionBundle(id);
  if (!bundle || bundle.session.crewId !== crew.id) notFound();
  const { session, attendance, ratings } = bundle;
  const members = await listMembers(crew.id);
  const played = attendance.filter((a) => a.attended).map((a) => members.find((m) => m.id === a.userId)).filter((m): m is NonNullable<typeof m> => !!m);
  const sport = sportOf(session.sport);
  const mine = ratings.filter((r) => r.raterId === user.id);
  const iPlayed = played.some((p) => p.id === user.id);

  return (
    <CrewShell crew={crew} user={user} active="sessions">
      <PageTitle eyebrow={session.title} title="Three taps">
        {mine.length ? "You've voted. Change your mind below." : "Pick one name for each. Your votes are private; only the totals show."}
      </PageTitle>
      {session.status !== "played" ? (
        <EmptyState title="Not played yet" body="The organiser confirms who turned up first." action={<LinkButton href={`/crew/${slug}/s/${id}`} variant="secondary">Back</LinkButton>} />
      ) : !iPlayed ? (
        <EmptyState title="Players only" body="Only people who played this one can vote." action={<LinkButton href={`/crew/${slug}/s/${id}`} variant="secondary">Back to session</LinkButton>} />
      ) : (
        <ActionForm action={rate} className="max-w-md">
          <input type="hidden" name="sessionId" value={session.id} />
          {sport.ratings.map((c) => (
            <fieldset key={c.key} className="border border-line rounded-md p-3">
              <legend className="px-1 display text-xl font-bold uppercase">{c.prompt}</legend>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {played
                  .filter((p) => c.points === 0 || p.id !== user.id)
                  .map((p) => (
                    <label key={p.id} className="flex items-center gap-2 border border-line rounded-sm px-2.5 py-2 has-checked:border-pitch has-checked:bg-pitch-soft cursor-pointer">
                      <input type="radio" name={`cat_${c.key}`} value={p.id} defaultChecked={mine.some((r) => r.category === c.key && r.rateeId === p.id)} />
                      <Avatar name={p.name} hue={p.hue} size={24} />
                      <span className="text-sm font-semibold truncate">{p.name.split(" ")[0]}</span>
                    </label>
                  ))}
              </div>
              {c.points === 0 ? <p className="text-xs text-ink-3 mt-2">Banter only. No points either way.</p> : null}
            </fieldset>
          ))}
          <SubmitButton pendingText="Saving…" className="min-h-12 text-base">
            {mine.length ? "Update votes" : "Submit votes"}
          </SubmitButton>
        </ActionForm>
      )}
    </CrewShell>
  );
}
