import type { Metadata } from "next";
import { requireCrewPage } from "@/lib/access";
import { listMembers } from "@/lib/queries";
import { SPORTS } from "@/domain/sports";
import { CrewShell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { ShareButtons } from "@/components/share";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Field, PageTitle, Panel, Pill } from "@/components/ui";
import { removeMember, rotateInvite, setMemberRole, updateCrew } from "@/lib/actions/crew";
import { fmtDay } from "@/lib/format";

export const metadata: Metadata = { title: "Crew" };

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const members = await listMembers(crew.id);
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/join/${crew.inviteToken}`;
  return (
    <CrewShell crew={crew} user={user} active="settings">
      <PageTitle eyebrow={`${members.length} members · since ${fmtDay(crew.createdAt)}`} title={crew.name} />

      <Panel className="p-4 mb-4 flex flex-col gap-3">
        <div className="eyebrow">Invite link</div>
        <p className="text-sm text-ink-2">Anyone with this joins by typing their name. Pin it in the group chat.</p>
        <code className="text-xs bg-ground-2 border border-line rounded-sm px-2 py-1.5 wrap-anywhere">{inviteUrl}</code>
        <div className="flex flex-wrap gap-2 items-center">
          <ShareButtons text={`Join ${crew.name} on Roll Call so you can tap in to sessions:`} url={inviteUrl} label="Send invite" />
          {isOrganiser ? (
            <form action={rotateInvite}>
              <input type="hidden" name="crewId" value={crew.id} />
              <Button type="submit" variant="ghost">
                New link
              </Button>
            </form>
          ) : null}
        </div>
      </Panel>

      <Panel className="mb-4 divide-y divide-line-2">
        {members.map((m) => (
          <div key={m.id} className="px-3 py-2.5 flex items-center gap-3">
            <Avatar name={m.name} hue={m.hue} size={30} />
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
                  <Button type="submit" variant="ghost" className="min-h-8 px-2 text-xs">
                    {m.role === "organiser" ? "Demote" : "Make organiser"}
                  </Button>
                </form>
                {m.id !== user.id ? (
                  <form action={removeMember}>
                    <input type="hidden" name="crewId" value={crew.id} />
                    <input type="hidden" name="userId" value={m.id} />
                    <Button type="submit" variant="ghost" className="min-h-8 px-2 text-xs text-red">
                      Remove
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </Panel>

      {isOrganiser ? (
        <Panel className="p-4 mb-4">
          <div className="eyebrow mb-2">Crew settings</div>
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

      <form action={removeMember} className="mt-2">
        <input type="hidden" name="crewId" value={crew.id} />
        <input type="hidden" name="userId" value={user.id} />
        <Button type="submit" variant="danger">
          Leave this crew
        </Button>
      </form>
    </CrewShell>
  );
}
