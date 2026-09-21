import type { Metadata } from "next";
import { requireCrewPage } from "@/lib/access";
import { getCrewLedger, listMembers, listSessions } from "@/lib/queries";
import { CrewShell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconArrowDown, IconCheck, IconChevron, IconCoins } from "@/components/icons";
import { Button, Field, Notice, PageTitle, Panel, Pill, Stat, cls } from "@/components/ui";
import { PayByCard } from "@/components/pay";
import { deleteLedgerEntry, recordPayment } from "@/lib/actions/session";
import { fmtDay, pounds } from "@/lib/format";

export const metadata: Metadata = { title: "Money" };

export default async function MoneyPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { slug } = await params;
  const { paid } = await searchParams;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const [{ entries, balances }, members, sessions] = await Promise.all([getCrewLedger(crew.id), listMembers(crew.id), listSessions(crew.id)]);
  const rows = members
    .map((m) => ({ m, b: balances.get(m.id) ?? { userId: m.id, charged: 0, paid: 0, owed: 0 } }))
    .sort((a, b) => b.b.owed - a.b.owed);
  const totalOwed = rows.reduce((t, r) => t + Math.max(0, r.b.owed), 0);
  const totalCollected = rows.reduce((t, r) => t + r.b.paid, 0);
  const totalCharged = rows.reduce((t, r) => t + r.b.charged, 0);
  const mine = balances.get(user.id)?.owed ?? 0;
  const sessionName = (id: string | null) => sessions.find((s) => s.id === id)?.title ?? "";

  return (
    <CrewShell crew={crew} user={user} active="money">
      <PageTitle eyebrow="Ledger" title="Money">
        Shares are raised when a session is confirmed as played. Late drops and no-shows still owe. The organiser marks people paid.
      </PageTitle>

      {paid ? (
        <div className="mb-4 anim-pop">
          <Notice tone="good">Payment received. It shows in the ledger as soon as Stripe confirms it, usually within a few seconds.</Notice>
        </div>
      ) : null}
      <Panel className="surface-raised p-4 grid grid-cols-3 gap-3 mb-4 anim-rise">
        <Stat label="Outstanding" value={pounds(totalOwed)} tone={totalOwed > 0 ? "bad" : "good"} sub={totalOwed > 0 ? "still to come in" : "all in"} />
        <Stat label="Collected" value={pounds(totalCollected)} sub={`of ${pounds(totalCharged)} charged`} />
        <Stat label="You" value={mine > 0 ? pounds(mine) : "Settled"} tone={mine > 0 ? "bad" : "good"} sub={mine > 0 ? "owed to the crew" : mine < 0 ? `${pounds(-mine)} in credit` : undefined} />
      </Panel>

      {mine > 0 ? (
        <div className="mb-4">
          <PayByCard crewId={crew.id} owedPence={mine} enabled={crew.stripeChargesEnabled} />
        </div>
      ) : null}
      <Panel className="divide-y divide-line-2 mb-4 anim-rise-2">
        {rows.map(({ m, b }) => {
          const share = b.charged > 0 ? Math.min(1, b.paid / b.charged) : b.paid > 0 ? 1 : 0;
          return (
            <div key={m.id} className="px-3 py-3 flex items-start gap-3">
              <Avatar name={m.name} hue={m.hue} size={36} />
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">
                    {m.name}
                    {m.id === user.id ? <span className="text-ink-3 font-normal"> (you)</span> : null}
                  </span>
                  {b.owed > 0 ? <Pill tone="bad">Owes {pounds(b.owed)}</Pill> : b.owed < 0 ? <Pill tone="good">Credit {pounds(-b.owed)}</Pill> : <Pill tone="good">Settled</Pill>}
                </div>
                <span className="text-xs text-ink-3 tnum">
                  {pounds(b.charged)} charged · {pounds(b.paid)} paid
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-1 flex-1 rounded-full bg-ground-2 overflow-hidden" aria-hidden="true">
                    <div className={cls("h-full rounded-full", b.owed > 0 ? "bg-red" : "bg-pitch")} style={{ width: `${Math.round(share * 100)}%` }} />
                  </div>
                  {isOrganiser && b.owed > 0 ? (
                    <ActionForm action={recordPayment} className="gap-0">
                      <input type="hidden" name="crewId" value={crew.id} />
                      <input type="hidden" name="userId" value={m.id} />
                      <input type="hidden" name="amount" value={pounds(b.owed).slice(1)} />
                      <input type="hidden" name="method" value="transfer" />
                      <SubmitButton variant="ghost" className="min-h-8 px-2.5 text-xs border border-line" pendingText="…">
                        Paid up
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </Panel>

      {isOrganiser ? (
        <Panel className="p-4 mb-4 anim-rise-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0 text-pitch">
              <IconCoins size={16} />
            </span>
            <div className="eyebrow">Record a payment</div>
          </div>
          <ActionForm action={recordPayment}>
            <input type="hidden" name="crewId" value={crew.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Who">
                <select name="userId" required defaultValue="">
                  <option value="" disabled>
                    Pick
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount (£)">
                <input name="amount" inputMode="decimal" required placeholder="6.50" />
              </Field>
              <Field label="How">
                <select name="method" defaultValue="transfer">
                  <option value="transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="waived">Waived</option>
                </select>
              </Field>
              <Field label="For">
                <select name="sessionId" defaultValue="">
                  <option value="">General</option>
                  {sessions
                    .filter((s) => s.status === "played")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} · {fmtDay(s.startsAt)}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <Field label="Note">
              <input name="note" maxLength={120} placeholder="Optional" />
            </Field>
            <SubmitButton variant="secondary" className="self-start" pendingText="Saving…">
              Record
            </SubmitButton>
          </ActionForm>
        </Panel>
      ) : null}

      <details className="surface group">
        <summary className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer list-none select-none">
          <span className="eyebrow">Every entry ({entries.length})</span>
          <IconChevron size={16} className="text-ink-3 transition-transform group-open:rotate-90" />
        </summary>
        {entries.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-ink-3">Nothing yet. The first played session raises the first charges.</p>
        ) : (
          <ol className="divide-y divide-line-2 border-t border-line-2">
            {entries.map((e) => {
              const m = members.find((x) => x.id === e.userId);
              const charge = e.kind === "charge";
              return (
                <li key={e.id} className="px-3 py-2.5 flex items-center gap-2.5 text-sm">
                  <span className={cls("w-7 h-7 rounded-full flex items-center justify-center shrink-0", charge ? "bg-red-soft text-red" : "bg-pitch-soft text-pitch")}>
                    {charge ? <IconArrowDown size={14} strokeWidth={2.2} /> : <IconCheck size={14} />}
                  </span>
                  <span className="eyebrow w-16 shrink-0">{fmtDay(e.createdAt)}</span>
                  <span className="flex-1 truncate">
                    <strong>{m?.name ?? "?"}</strong> {charge ? `charged (${e.reason.replace("_", " ")})` : e.reason === "waived" ? "waived" : `paid by ${e.reason}`}
                    {e.sessionId ? <span className="text-ink-3"> · {sessionName(e.sessionId)}</span> : null}
                    {e.note ? <span className="text-ink-3"> · {e.note}</span> : null}
                  </span>
                  <span className={cls("tnum display text-lg font-bold", charge ? "text-red" : "text-pitch")}>
                    {charge ? "+" : "−"}
                    {pounds(e.amountPence)}
                  </span>
                  {isOrganiser && e.kind === "payment" ? (
                    <form action={deleteLedgerEntry}>
                      <input type="hidden" name="crewId" value={crew.id} />
                      <input type="hidden" name="entryId" value={e.id} />
                      <Button type="submit" variant="ghost" className="min-h-8 px-2 text-xs" aria-label="Undo this payment">
                        Undo
                      </Button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </details>
    </CrewShell>
  );
}
