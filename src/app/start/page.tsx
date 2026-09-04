import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { SPORTS } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, PageTitle } from "@/components/ui";
import { createCrew } from "@/lib/actions/crew";

export const metadata: Metadata = { title: "Start a crew" };

export default async function StartPage() {
  const user = await getCurrentUser();
  return (
    <PlainShell user={user}>
      <PageTitle eyebrow="Under a minute" title="Start your crew">
        One organiser, one link, everyone else taps in. You can change any of this later.
      </PageTitle>
      <ActionForm action={createCrew} className="max-w-md">
        {!user ? (
          <Field label="Your name" hint="What the crew calls you.">
            <input name="organiserName" required minLength={2} maxLength={40} autoComplete="given-name" placeholder="Sam" />
          </Field>
        ) : (
          <p className="text-sm text-ink-2">
            Organising as <strong>{user.name}</strong>.
          </p>
        )}
        <Field label="Crew name">
          <input name="name" required minLength={2} maxLength={40} placeholder="Tuesday FC" autoFocus={!!user} />
        </Field>
        <Field label="Main sport" hint="Sessions can be any sport. This sets the default.">
          <div className="grid grid-cols-2 gap-2">
            {Object.values(SPORTS).map((s, i) => (
              <label key={s.key} className="flex items-center gap-2 border border-line rounded-sm px-3 py-2.5 has-checked:border-pitch has-checked:bg-pitch-soft cursor-pointer">
                <input type="radio" name="sport" value={s.key} defaultChecked={i === 0} required />
                <span className="font-semibold text-sm">{s.label}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="City">
          <input name="city" defaultValue="London" required maxLength={40} />
        </Field>
        <Field label="Late-drop window (hours)" hint="Drop out inside this window before kick-off and your share still stands. 24 is the usual.">
          <input name="lateDropHours" type="number" min={0} max={168} defaultValue={24} inputMode="numeric" />
        </Field>
        <SubmitButton pendingText="Creating…">Create crew</SubmitButton>
      </ActionForm>
    </PlainShell>
  );
}
