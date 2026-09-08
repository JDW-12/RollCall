import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { getSessionBundle, listMembers } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { CrewShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { IconCheck } from "@/components/icons";
import { EmptyState, LinkButton, PageTitle, cls } from "@/components/ui";
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
  const total = sport.ratings.length;

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
        <ActionForm action={rate} className="max-w-md pb-20 sm:pb-0">
          <input type="hidden" name="sessionId" value={session.id} />
          {sport.ratings.map((c, i) => {
            const banter = c.points === 0;
            return (
              <fieldset key={c.key} className={cls("surface p-4 flex flex-col gap-3", banter && "border-card/50", i === 0 ? "anim-rise" : i === 1 ? "anim-rise-2" : "anim-rise-3")}>
                <legend className="sr-only">{c.prompt}</legend>
                <div className="flex flex-col gap-1">
                  <span className={cls("eyebrow tnum", banter ? "text-card-ink" : "text-pitch")}>
                    {i + 1}/{total} · {c.label}
                  </span>
                  <span className="display text-2xl font-bold uppercase leading-none">{c.prompt}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {played
                    .filter((p) => c.points === 0 || p.id !== user.id)
                    .map((p) => (
                      <label
                        key={p.id}
                        className={cls(
                          "group press relative flex flex-col items-center gap-1.5 rounded-md border border-line bg-panel-2 px-2 pt-3 pb-2.5 cursor-pointer min-h-[92px] has-focus-visible:outline-2",
                          banter ? "has-checked:border-card has-checked:bg-card-soft has-focus-visible:outline-card" : "has-checked:border-pitch has-checked:bg-pitch-soft has-focus-visible:outline-pitch",
                        )}
                      >
                        <input type="radio" name={`cat_${c.key}`} value={p.id} defaultChecked={mine.some((r) => r.category === c.key && r.rateeId === p.id)} className="sr-only" />
                        <Avatar name={p.name} hue={p.hue} size={40} />
                        <span className="text-sm font-semibold truncate max-w-full">{p.name.split(" ")[0]}</span>
                        <span
                          className={cls(
                            "absolute top-1.5 right-1.5 w-5 h-5 rounded-full inline-flex items-center justify-center text-transparent",
                            banter ? "group-has-checked:bg-card group-has-checked:text-pitch-ink" : "group-has-checked:bg-pitch group-has-checked:text-pitch-ink",
                          )}
                          aria-hidden="true"
                        >
                          <IconCheck size={12} strokeWidth={3} />
                        </span>
                      </label>
                    ))}
                </div>
                {banter ? <p className="text-xs text-card-ink/80">Banter only. No points either way.</p> : null}
              </fieldset>
            );
          })}
          <div className="fixed inset-x-0 bottom-[76px] z-10 px-4 pt-2 pb-2 bg-ground/90 backdrop-blur-md sm:static sm:inset-auto sm:p-0 sm:bg-transparent sm:backdrop-blur-none">
            <SubmitButton pendingText="Saving…" className="min-h-14 w-full text-base">
              {mine.length ? "Update votes" : "Submit votes"}
            </SubmitButton>
          </div>
        </ActionForm>
      )}
    </CrewShell>
  );
}
