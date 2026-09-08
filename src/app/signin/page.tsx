import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/access";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Wordmark } from "@/components/logo";
import { Eyebrow, Field } from "@/components/ui";
import { requestCode } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user && user.email) redirect(safeNext(next));
  return (
    <PlainShell user={user}>
      <div className="max-w-sm mx-auto mt-4 sm:mt-10 anim-rise">
        <div className="surface surface-raised p-6 sm:p-7 flex flex-col gap-5">
          <Wordmark size={30} />
          <header className="flex flex-col gap-2">
            <Eyebrow>No password</Eyebrow>
            <h1 className="text-[36px] font-bold uppercase leading-[0.95]">{user ? "Add your email" : "Sign in"}</h1>
            <p className="text-sm text-ink-2">
              {user
                ? "You joined from an invite link. Add an email so you can get back in from any phone."
                : "We'll email you a six-digit code. Joined from an invite link? You don't need this until you change phones."}
            </p>
          </header>
          <ActionForm action={requestCode}>
            <input type="hidden" name="next" value={next ?? "/home"} />
            <Field label="Email">
              <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" autoFocus className="text-base" />
            </Field>
            <SubmitButton pendingText="Sending…" className="min-h-12">
              Email me a code
            </SubmitButton>
          </ActionForm>
        </div>
      </div>
    </PlainShell>
  );
}
