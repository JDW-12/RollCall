import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { devEmailMode } from "@/lib/email";
import { isSandbox } from "@/lib/env";
import { getDb, schema } from "@/db/client";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Wordmark } from "@/components/logo";
import { Eyebrow, Field, Notice } from "@/components/ui";
import { verifyCode } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Enter your code" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ email?: string; next?: string }> }) {
  const { email = "", next = "/home" } = await searchParams;
  const user = await getCurrentUser();
  let sandboxCode: string | null = null;
  if (isSandbox() && email) {
    const db = await getDb();
    const row = (
      await db
        .select({ code: schema.loginCodes.code })
        .from(schema.loginCodes)
        .where(and(eq(schema.loginCodes.email, email.toLowerCase()), isNull(schema.loginCodes.usedAt), gt(schema.loginCodes.expiresAt, new Date())))
        .orderBy(desc(schema.loginCodes.createdAt))
        .limit(1)
    )[0];
    sandboxCode = row?.code ?? null;
  }
  return (
    <PlainShell user={user}>
      <div className="max-w-sm mx-auto mt-4 sm:mt-10 anim-rise">
        <div className="surface surface-raised p-6 sm:p-7 flex flex-col gap-5">
          <Wordmark size={30} />
          <header className="flex flex-col gap-2">
            <Eyebrow>Check your inbox</Eyebrow>
            <h1 className="text-[36px] font-bold uppercase leading-[0.95]">Enter the code</h1>
            <p className="text-sm text-ink-2">
              Sent to <strong className="text-ink">{email}</strong>. It lasts ten minutes.
            </p>
          </header>
          {sandboxCode ? (
            <Notice tone="warn">
              Sandbox: no email is sent. Your code is <strong className="font-mono text-base">{sandboxCode}</strong>.
            </Notice>
          ) : devEmailMode() ? (
            <Notice tone="warn">Email isn&apos;t configured on this server, so the code was printed to the server console instead.</Notice>
          ) : null}
          <ActionForm action={verifyCode}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="next" value={next} />
            <Field label="Six-digit code">
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                required
                autoFocus
                placeholder="000000"
                className="display font-display text-[44px] font-bold tracking-[0.32em] text-center min-h-16 pl-[0.32em]"
              />
            </Field>
            <SubmitButton pendingText="Checking…" className="min-h-12">
              Sign in
            </SubmitButton>
          </ActionForm>
        </div>
      </div>
    </PlainShell>
  );
}
