import { cardTotal } from "@/domain/fees";
import { feeConfig, stripeConfigured } from "@/lib/stripe";
import { pounds } from "@/lib/format";
import { startCardPayment } from "@/lib/actions/stripe";
import { ActionForm, SubmitButton } from "./action-form";

/** "Pay £6.86 by card" with the fee in plain sight. Renders nothing unless the crew can take cards. */
export function PayByCard({ crewId, sessionId, owedPence, enabled, compact = false }: { crewId: string; sessionId?: string; owedPence: number; enabled: boolean; compact?: boolean }) {
  if (!stripeConfigured() || !enabled || owedPence <= 0) return null;
  const { share, fee, total } = cardTotal(owedPence, feeConfig());
  return (
    <ActionForm action={startCardPayment} className={compact ? "gap-0" : "gap-1"}>
      <input type="hidden" name="crewId" value={crewId} />
      {sessionId ? <input type="hidden" name="sessionId" value={sessionId} /> : null}
      <SubmitButton className={compact ? "min-h-8 px-2.5 text-xs" : "min-h-12 text-base"} pendingText="Opening Stripe…">
        Pay {pounds(total)} by card
      </SubmitButton>
      {!compact ? (
        <span className="text-xs text-ink-3">
          {pounds(share)} share + {pounds(fee)} Roll Call fee. Goes straight to your organiser.
        </span>
      ) : null}
    </ActionForm>
  );
}
