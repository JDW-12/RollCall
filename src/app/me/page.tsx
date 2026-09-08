import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Field, LinkButton, PageTitle, Panel } from "@/components/ui";
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
      <PageTitle eyebrow="Your account" title={user.name} action={<Avatar name={user.name} hue={user.hue} size={56} />} />
      <div className="grid gap-4 max-w-md">
        <Panel className="p-4">
          <ActionForm action={updateProfile}>
            <Field label="Name" hint="Shown on cards and the table.">
              <input name="name" defaultValue={user.name} required minLength={2} maxLength={40} />
            </Field>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel className="p-4 flex flex-col gap-2">
          <div className="eyebrow">Email</div>
          {user.email ? (
            <p>{user.email}</p>
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
          <div>
            <div className="eyebrow">Look</div>
            <p className="text-sm text-ink-2">Floodlit is the default. Daylight if you prefer.</p>
          </div>
          <form action={setTheme} className="flex gap-1">
            <Button type="submit" name="theme" value="dark" variant={theme === "dark" ? "primary" : "secondary"} className="min-h-9 px-3 text-sm">
              Floodlit
            </Button>
            <Button type="submit" name="theme" value="light" variant={theme === "light" ? "primary" : "secondary"} className="min-h-9 px-3 text-sm">
              Daylight
            </Button>
          </form>
        </Panel>
        <div className="flex items-center justify-between">
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
