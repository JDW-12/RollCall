import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { devEmailMode } from "@/lib/email";
import { isSandbox } from "@/lib/env";
import { getDb, schema } from "@/db/client";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { PlainShell } from "@/components/shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Notice, PageTitle } from "@/components/ui";
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
      <PageTitle eyebrow="Check your inbox" title="Enter the code">
        Sent to <strong>{email}</strong>. It lasts ten minutes.
      </PageTitle>
      {sandboxCode ? (
        <Notice tone="warn">
          Sandbox: no email is sent. Your code is <strong className="font-mono text-base">{sandboxCode}</strong>.
        </Notice>
      ) : devEmailMode() ? (
        <Notice tone="warn">Email isn&apos;t configured on this server, so the code was printed to the server console instead.</Notice>
      ) : null}
      <ActionForm action={verifyCode} className="max-w-sm mt-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <Field label="Six-digit code">
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required autoFocus className="display text-3xl tracking-[0.3em] text-center" />
        </Field>
        <SubmitButton pendingText="Checking…">Sign in</SubmitButton>
      </ActionForm>
    </PlainShell>
  );
}
