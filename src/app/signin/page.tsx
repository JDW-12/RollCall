import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, PageTitle } from "@/components/ui";
import { requestCode } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user && user.email) redirect(next && next.startsWith("/") ? next : "/home");
  return (
    <PlainShell user={user}>
      <PageTitle eyebrow="No password" title={user ? "Add your email" : "Sign in"}>
        {user
          ? "You joined from an invite link. Add an email so you can get back in from any phone."
          : "We'll email you a six-digit code. Joined from an invite link? You don't need this until you change phones."}
      </PageTitle>
      <ActionForm action={requestCode} className="max-w-sm">
        <input type="hidden" name="next" value={next ?? "/home"} />
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" autoFocus />
        </Field>
        <SubmitButton pendingText="Sending…">Email me a code</SubmitButton>
      </ActionForm>
    </PlainShell>
  );
}
