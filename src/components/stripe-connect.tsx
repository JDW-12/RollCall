import type { Crew } from "@/db/schema";
import { stripeConfigured, feeConfig } from "@/lib/stripe";
import { connectStripe, refreshStripeAction } from "@/lib/actions/stripe";
import { ActionForm, SubmitButton } from "./action-form";
import { Button, Eyebrow, Panel, Pill } from "./ui";
import { IconCoins } from "./icons";

/** Organiser's card-payments block on crew settings. */
export function StripeConnectPanel({ crew }: { crew: Crew }) {
  const fee = feeConfig();
  const feeLine = `${(fee.bps / 100).toFixed(fee.bps % 100 ? 2 : 1)}% + ${fee.fixedPence}p per payment, shown to the payer on the button`;
  return (
    <Panel className="p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <Eyebrow className="flex items-center gap-1.5">
          <IconCoins size={14} /> Card payments
        </Eyebrow>
        {!stripeConfigured() ? <Pill>Not available yet</Pill> : crew.stripeChargesEnabled ? <Pill tone="good">Live</Pill> : crew.stripeAccountId ? <Pill tone="warn">Setup incomplete</Pill> : <Pill>Off</Pill>}
      </div>
      {!stripeConfigured() ? (
        <p className="text-sm text-ink-2">Card payments aren&apos;t switched on for this server. Until then the ledger runs on bank transfers and &quot;mark as paid&quot;.</p>
      ) : (
        <>
          <p className="text-sm text-ink-2">
            Members pay their share by card and it lands in your own Stripe account, not ours. Roll Call never holds the money. Fee: {feeLine}.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <ActionForm action={connectStripe} className="gap-0">
              <input type="hidden" name="crewId" value={crew.id} />
              <SubmitButton variant={crew.stripeChargesEnabled ? "secondary" : "primary"} pendingText="Opening Stripe…">
                {crew.stripeAccountId ? (crew.stripeChargesEnabled ? "Manage on Stripe" : "Finish setup on Stripe") : "Set up card payments"}
              </SubmitButton>
            </ActionForm>
            {crew.stripeAccountId ? (
              <form action={refreshStripeAction}>
                <input type="hidden" name="crewId" value={crew.id} />
                <Button type="submit" variant="ghost">
                  Check status
                </Button>
              </form>
            ) : null}
          </div>
        </>
      )}
    </Panel>
  );
}
