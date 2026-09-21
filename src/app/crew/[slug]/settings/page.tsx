import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import { requireCrewPage } from "@/lib/access";
import { listMembers } from "@/lib/queries";
import { SPORTS, sportOf } from "@/domain/sports";
import { CrewBand, CrewShell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { ShareButtons } from "@/components/share";
import { StripeConnectPanel } from "@/components/stripe-connect";
import { refreshStripe } from "@/lib/actions/stripe";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconPeople, IconPin, IconShare, SportIcon } from "@/components/icons";
import { Button, Eyebrow, Field, Panel, Pill } from "@/components/ui";
import { removeMember, rotateInvite, setMemberRole, updateCrew } from "@/lib/actions/crew";
import { fmtDay } from "@/lib/format";

export const metadata: Metadata = { title: "Crew" };

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ stripe?: string }> }) {
  const { slug } = await params;
  const { stripe: stripeFlag } = await searchParams;
  const first = await requireCrewPage(slug);
  const { user, isOrganiser } = first;
  let crew = first.crew;
  if (stripeFlag && isOrganiser) {
    // Back from Stripe onboarding: pull the account state before rendering.
    await refreshStripe(crew.id);
    crew = (await requireCrewPage(slug)).crew;
  }
  const members = await listMembers(crew.id);
  const inviteUrl = `${await appUrl()}/join/${crew.inviteToken}`;
  const sport = sportOf(crew.sport);
  const organisers = members.filter((m) => m.role === "organiser").length;
  return (
    <CrewShell crew={crew} user={user} active="settings">
      <CrewBand crew={crew}>
        <div className="flex items-end justify-between gap-4 anim-rise">
          <div className="flex flex-col gap-2 min-w-0">
            <Eyebrow>
              {members.length} members · since {fmtDay(crew.createdAt)}
            </Eyebrow>
            <h1 className="text-[44px] font-bold uppercase leading-[0.92] wrap-anywhere">{crew.name}</h1>
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <span className="inline-flex items-center gap-1">
                <SportIcon sport={crew.sport} size={16} /> {sport.label}
              </span>
              <span className="text-ink-3">·</span>
              <span className="inline-flex items-center gap-1">
                <IconPin size={16} /> {crew.city}
              </span>
            </div>
          </div>
          <span className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0 text-ink" style={{ background: `oklch(0.45 0.13 ${crew.hue} / 0.55)` }} aria-hidden="true">
            <SportIcon sport={crew.sport} size={34} />
          </span>
        </div>
      </CrewBand>

      {/* The ticket: what you paste into the group chat. */}
      <section className="relative mt-4 mb-4 anim-rise-2">
        <div className="surface surface-raised border-2 border-dashed border-line rounded-lg p-5 flex flex-col gap-3 overflow-hidden">
          <div className="absolute inset-0 pitch-lines opacity-60 pointer-events-none" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-pitch-soft text-pitch flex items-center justify-center shrink-0">
                <IconShare size={16} />
              </span>
              <Eyebrow>Invite link</Eyebrow>
            </div>
            <Pill tone="good">Admit anyone</Pill>
          </div>
          <p className="relative text-sm text-ink-2">Anyone with this joins by typing their name. Pin it in the group chat.</p>
          <code className="relative block font-mono text-[15px] sm:text-base font-semibold bg-ground-2 border border-line rounded-sm px-3 py-3 wrap-anywhere leading-snug">{inviteUrl}</code>
          <div className="relative flex flex-wrap gap-2 items-center">
            <ShareButtons text={`Join ${crew.name} on Roll Call so you can tap in to sessions:`} url={inviteUrl} label="Send invite" crewId={crew.id} what="invite" />
            {isOrganiser ? (
              <form action={rotateInvite}>
                <input type="hidden" name="crewId" value={crew.id} />
                <Button type="submit" variant="ghost">
                  New link
                </Button>
              </form>
            ) : null}
          </div>
        </div>
        <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-ground border border-line" aria-hidden="true" />
        <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-ground border border-line" aria-hidden="true" />
      </section>

      <Panel className="mb-4 anim-rise-3">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-line-2">
          <span className="w-8 h-8 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0 text-ink-2">
            <IconPeople size={16} />
          </span>
          <Eyebrow>
            {members.length} in the crew · {organisers} organiser{organisers === 1 ? "" : "s"}
          </Eyebrow>
        </div>
        <div className="divide-y divide-line-2">
          {members.map((m) => (
            <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
              <Avatar name={m.name} hue={m.hue} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {m.name}
                  {m.id === user.id ? <span className="text-ink-3 font-normal"> (you)</span> : null}
                </div>
                <div className="text-xs text-ink-3">Joined {fmtDay(m.joinedAt)}</div>
              </div>
              <Pill tone={m.role === "organiser" ? "good" : "neutral"}>{m.role}</Pill>
              {isOrganiser ? (
                <div className="flex gap-1">
                  <form action={setMemberRole}>
                    <input type="hidden" name="crewId" value={crew.id} />
                    <input type="hidden" name="userId" value={m.id} />
                    <input type="hidden" name="role" value={m.role === "organiser" ? "member" : "organiser"} />
                    <Button type="submit" variant="ghost" className="min-h-9 px-2 text-xs">
                      {m.role === "organiser" ? "Demote" : "Make organiser"}
                    </Button>
                  </form>
                  {m.id !== user.id ? (
                    <form action={removeMember}>
                      <input type="hidden" name="crewId" value={crew.id} />
                      <input type="hidden" name="userId" value={m.id} />
                      <Button type="submit" variant="ghost" className="min-h-9 px-2 text-xs text-red">
                        Remove
                      </Button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      {isOrganiser ? <StripeConnectPanel crew={crew} /> : null}

      {isOrganiser ? (
        <Panel className="p-4 mb-4">
          <Eyebrow className="mb-3">Crew settings</Eyebrow>
          <ActionForm action={updateCrew}>
            <input type="hidden" name="crewId" value={crew.id} />
            <Field label="Name">
              <input name="name" defaultValue={crew.name} required minLength={2} maxLength={40} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Main sport">
                <select name="sport" defaultValue={crew.sport}>
                  {Object.values(SPORTS).map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="City">
                <input name="city" defaultValue={crew.city} required maxLength={40} />
              </Field>
              <Field label="Late-drop window (hours)">
                <input name="lateDropHours" type="number" min={0} max={168} defaultValue={crew.lateDropHours} inputMode="numeric" />
              </Field>
              <Field label="Season name">
                <input name="seasonName" defaultValue={crew.seasonName} maxLength={30} />
              </Field>
            </div>
            <SubmitButton variant="secondary" className="self-start" pendingText="Saving…">
              Save
            </SubmitButton>
          </ActionForm>
        </Panel>
      ) : null}

      <div className="mt-6 pt-5 border-t border-line flex items-center justify-between gap-3">
        <p className="text-sm text-ink-3">Leaving takes you off the table. The invite link gets you back in.</p>
        <form action={removeMember}>
          <input type="hidden" name="crewId" value={crew.id} />
          <input type="hidden" name="userId" value={user.id} />
          <Button type="submit" variant="danger">
            Leave this crew
          </Button>
        </form>
      </div>
    </CrewShell>
  );
}
