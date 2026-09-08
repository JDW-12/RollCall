import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Eyebrow, Field, LinkButton, Panel, Pill } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { setTheme, signOut, updateProfile } from "@/lib/actions/auth";
import { cookies } from "next/headers";

export const metadata: Metadata = { title: "You" };

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/me");
  const theme = (await cookies()).get("rc_theme")?.value === "light" ? "light" : "dark";
  return (
    <PlainShell user={user}>
      <header className="flex items-center gap-4 mb-6 anim-rise">
        <Avatar name={user.name} hue={user.hue} size={84} className="ring-4 ring-ground shadow-[var(--shadow)]" />
        <div className="flex flex-col gap-1.5 min-w-0">
          <Eyebrow>Your account</Eyebrow>
          <h1 className="text-[40px] font-bold uppercase leading-[0.95] wrap-anywhere">{user.name}</h1>
          {user.email ? <span className="text-sm text-ink-2 truncate">{user.email}</span> : <Pill tone="warn">No email yet</Pill>}
        </div>
      </header>

      <div className="grid gap-4 max-w-md">
        <Panel className="p-4 anim-rise-2">
          <Eyebrow className="mb-3">Name</Eyebrow>
          <ActionForm action={updateProfile}>
            <Field label="Name" hint="Shown on cards and the table.">
              <input name="name" defaultValue={user.name} required minLength={2} maxLength={40} />
            </Field>
            <SubmitButton variant="secondary" className="self-start">
              Save
            </SubmitButton>
          </ActionForm>
        </Panel>

        <Panel className="p-4 flex flex-col gap-2 anim-rise-3">
          <Eyebrow>Email</Eyebrow>
          {user.email ? (
            <p className="font-semibold">{user.email}</p>
          ) : (
            <>
              <p className="text-sm text-ink-2">You joined from an invite link. Add an email so you can sign in on a new phone.</p>
              <LinkButton href="/signin?next=/me" variant="secondary" className="self-start">
                Add email
              </LinkButton>
            </>
          )}
        </Panel>

        <Panel className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow>Look</Eyebrow>
            <p className="text-sm text-ink-2 mt-1">Floodlit is the default. Daylight if you prefer.</p>
          </div>
          <form action={setTheme} className="flex gap-1 p-1 rounded-md bg-ground-2 border border-line shrink-0">
            <Button type="submit" name="theme" value="dark" variant={theme === "dark" ? "primary" : "ghost"} className="min-h-9 px-3 text-sm">
              Floodlit
            </Button>
            <Button type="submit" name="theme" value="light" variant={theme === "light" ? "primary" : "ghost"} className="min-h-9 px-3 text-sm">
              Daylight
            </Button>
          </form>
        </Panel>

        <div className="flex items-center justify-between pt-2">
          <LinkButton href="/home" variant="ghost">
            Your crews
          </LinkButton>
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </PlainShell>
  );
}
