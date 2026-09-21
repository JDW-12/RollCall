"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions/shared";
import { Button, Notice, cls } from "./ui";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  className,
  successMessage,
  marker,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  /** Optional data attribute name so helper components can find this form in the DOM. */
  marker?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={cls("flex flex-col gap-4", className)} {...(marker ? { [`data-${marker}`]: "" } : {})}>
      {children}
      {state.error ? (
        <Notice tone="bad">
          <span role="alert">{state.error}</span>
        </Notice>
      ) : null}
      {!state.error && (state.message || (state.ok && successMessage)) ? <Notice tone="good">{state.message ?? successMessage}</Notice> : null}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingText = "One sec…",
  variant = "primary",
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className} name={name} value={value} aria-busy={pending}>
      {pending ? pendingText : children}
    </Button>
  );
}
