import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { SPORTS } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SportIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { Eyebrow, Field, PageTitle, cls } from "@/components/ui";
import { createCrew } from "@/lib/actions/crew";

export const metadata: Metadata = { title: "Start a crew" };

function Step({ n, title, children, className }: { n: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cls("surface p-4 flex flex-col gap-3", className)}>
      <Eyebrow>
        <span className="text-pitch">{n}</span> {title}
      </Eyebrow>
      {children}
    </section>
  );
}

export default async function StartPage() {
  const user = await getCurrentUser();
  return (
    <PlainShell user={user}>
      <PageTitle eyebrow="Under a minute" title="Start your crew">
        One organiser, one link, everyone else taps in. You can change any of this later.
      </PageTitle>
      <ActionForm action={createCrew} className="max-w-md">
        <Step n="01" title="Your name" className="anim-rise">
          {!user ? (
            <Field label="What the crew calls you">
              <input name="organiserName" required minLength={2} maxLength={40} autoComplete="given-name" placeholder="Sam" />
            </Field>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar name={user.name} hue={user.hue} size={40} />
              <p className="text-sm text-ink-2">
                Organising as <strong className="text-ink">{user.name}</strong>.
              </p>
            </div>
          )}
        </Step>

        <Step n="02" title="Crew" className="anim-rise-2">
          <Field label="Crew name">
            <input name="name" required minLength={2} maxLength={40} placeholder="Tuesday FC" autoFocus={!!user} />
          </Field>
          <Field label="City">
            <input name="city" defaultValue="London" required maxLength={40} />
          </Field>
        </Step>

        <Step n="03" title="Sport" className="anim-rise-3">
          <p className="text-xs text-ink-3">Sessions can be any sport. This sets the default.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.values(SPORTS).map((s, i) => (
              <label key={s.key} className="press relative flex flex-col gap-2 border border-line rounded-md bg-panel-2 p-3 min-h-[88px] cursor-pointer has-checked:border-pitch has-checked:bg-pitch-soft has-checked:text-pitch">
                <input type="radio" name="sport" value={s.key} defaultChecked={i === 0} required className="absolute top-2.5 right-2.5" />
                <SportIcon sport={s.key} size={26} />
                <span className="font-semibold text-sm leading-tight pr-6">{s.label}</span>
              </label>
            ))}
          </div>
        </Step>

        <Step n="04" title="Rules">
          <Field label="Late-drop window (hours)" hint="Drop out inside this window before kick-off and your share still stands. 24 is the usual.">
            <input name="lateDropHours" type="number" min={0} max={168} defaultValue={24} inputMode="numeric" />
          </Field>
        </Step>

        <SubmitButton pendingText="Creating…" className="min-h-12 text-base">
          Create crew
        </SubmitButton>
      </ActionForm>
    </PlainShell>
  );
}
