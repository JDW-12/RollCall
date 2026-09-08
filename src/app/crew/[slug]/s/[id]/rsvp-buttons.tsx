"use client";

import { useActionState } from "react";
import { rsvp } from "@/lib/actions/session";
import { SubmitButton } from "@/components/action-form";
import { Notice, cls } from "@/components/ui";

export function RsvpButtons({ sessionId, mine, inVerb, userId, compact = false }: { sessionId: string; mine: "in" | "reserve" | "out" | null; inVerb: string; userId?: string; compact?: boolean }) {
  const [state, action] = useActionState(rsvp, {});
  const size = compact ? "min-h-9 px-3 text-sm" : "min-h-14 w-full text-base";
  return (
    <form action={action} className={cls("flex flex-col gap-2", compact ? "items-end" : "w-full")}>
      <input type="hidden" name="sessionId" value={sessionId} />
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      <div className={cls("grid gap-2 grid-cols-2", !compact && "w-full")}>
        <SubmitButton name="intent" value="in" variant={mine === "in" || mine === "reserve" ? "secondary" : "primary"} className={cls(size, !compact && (mine === "in" || mine === "reserve") && "border-pitch/60 text-pitch")} pendingText="…">
          {userId ? (mine === "in" ? "In" : mine === "reserve" ? "Reserve" : "Mark in") : mine === "in" ? "You're in" : mine === "reserve" ? "On reserves" : inVerb}
        </SubmitButton>
        <SubmitButton name="intent" value="out" variant={mine === "out" ? "secondary" : "ghost"} className={cls(size, mine !== "out" && "border border-line")} pendingText="…">
          {userId ? (mine === "out" ? "Out" : "Mark out") : mine === "out" ? "You're out" : "Can't make it"}
        </SubmitButton>
      </div>
      {state.error ? <Notice tone="bad">{state.error}</Notice> : state.message ? <Notice tone="warn">{state.message}</Notice> : null}
    </form>
  );
}
