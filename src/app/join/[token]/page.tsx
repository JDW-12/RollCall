import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findMembership } from "@/lib/access";
import { findCrewByInvite, listMembers } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconPin, IconWhistle, SportIcon } from "@/components/icons";
import { Eyebrow, Field, LinkButton } from "@/components/ui";
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
        <div className="max-w-sm mx-auto mt-6 surface p-8 flex flex-col items-center text-center gap-3 anim-rise">
          <span className="w-16 h-16 rounded-full bg-ground-2 text-ink-3 flex items-center justify-center">
            <IconWhistle size={32} />
          </span>
          <div className="display text-2xl font-bold uppercase">That link has expired</div>
          <p className="text-ink-2 max-w-[36ch]">Ask the organiser for a fresh invite link.</p>
          <LinkButton href="/">Home</LinkButton>
        </div>
      </PlainShell>
    );
  }
  if (user && (await findMembership(crew.id, user.id))) redirect(`/crew/${crew.slug}`);
  const members = await listMembers(crew.id);
  const sport = sportOf(crew.sport);
  const shown = members.slice(0, 8);
  const extra = members.length - shown.length;
  return (
    <PlainShell user={user}>
      <div className="relative max-w-md mx-auto mt-2 sm:mt-8 anim-rise">
        <div className="surface surface-raised rounded-lg overflow-hidden">
          {/* Stub: the crew. */}
          <div className="relative px-6 pt-7 pb-6 border-b-2 border-dashed border-line overflow-hidden">
            <div className="absolute inset-0 pitch-lines" aria-hidden="true" />
            <div className="absolute inset-0" style={{ background: `radial-gradient(520px 240px at 10% 0%, oklch(0.5 0.15 ${crew.hue} / 0.5), transparent 70%)` }} aria-hidden="true" />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <Eyebrow>You&apos;ve been invited</Eyebrow>
                <span className="w-11 h-11 rounded-md flex items-center justify-center shrink-0 text-ink" style={{ background: `oklch(0.45 0.13 ${crew.hue} / 0.6)` }} aria-hidden="true">
                  <SportIcon sport={crew.sport} size={22} />
                </span>
              </div>
              <h1 className="text-[52px] sm:text-[64px] font-extrabold uppercase leading-[0.88] wrap-anywhere">{crew.name}</h1>
              <div className="flex items-center gap-2 text-sm text-ink-2">
                <span className="inline-flex items-center gap-1">
                  <SportIcon sport={crew.sport} size={16} /> {sport.label}
                </span>
                <span className="text-ink-3">·</span>
                <span className="inline-flex items-center gap-1">
                  <IconPin size={16} /> {crew.city}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {shown.map((m) => (
                    <Avatar key={m.id} name={m.name} hue={m.hue} size={34} className="ring-2 ring-ground" />
                  ))}
                  {extra > 0 ? <span className="w-[34px] h-[34px] rounded-full bg-ground-2 border border-line ring-2 ring-ground inline-flex items-center justify-center font-mono text-[11px] text-ink-2">+{extra}</span> : null}
                </div>
                <span className="text-sm text-ink-2">
                  {members.length} in the crew so far{user ? "" : ". No sign-up, just your name."}
                </span>
              </div>
            </div>
          </div>

          {/* Stub: you. */}
          <div className="px-6 py-6">
            <ActionForm action={joinCrew}>
              <input type="hidden" name="token" value={token} />
              {user ? (
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} hue={user.hue} size={40} />
                  <p className="text-sm text-ink-2">
                    Joining as <strong className="text-ink">{user.name}</strong>.
                  </p>
                </div>
              ) : (
                <Field label="Your name" hint="This is all the crew needs.">
                  <input name="name" required minLength={2} maxLength={40} autoComplete="given-name" placeholder="Priya" autoFocus className="text-base" />
                </Field>
              )}
              <SubmitButton pendingText="Joining…" className="min-h-12 text-base">
                Join {crew.name}
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      </div>
    </PlainShell>
  );
}
