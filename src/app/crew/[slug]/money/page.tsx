import type { Metadata } from "next";
import { requireCrewPage } from "@/lib/access";
import { getCrewLedger, listMembers, listSessions } from "@/lib/queries";
import { CrewShell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Field, PageTitle, Panel, Pill, Stat } from "@/components/ui";
import { deleteLedgerEntry, recordPayment } from "@/lib/actions/session";
import { fmtDay, pounds } from "@/lib/format";

export const metadata: Metadata = { title: "Money" };

export default async function MoneyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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
      <Panel className="p-4 grid grid-cols-3 gap-3 mb-4">
        <Stat label="Outstanding" value={pounds(totalOwed)} tone={totalOwed > 0 ? "bad" : "good"} />
        <Stat label="Collected" value={pounds(totalCollected)} sub={`of ${pounds(totalCharged)} charged`} />
        <Stat label="You" value={mine > 0 ? pounds(mine) : "Settled"} tone={mine > 0 ? "bad" : "good"} sub={mine > 0 ? "owed to the crew" : undefined} />
      </Panel>

      <Panel className="divide-y divide-line-2 mb-4">
        {rows.map(({ m, b }) => (
          <div key={m.id} className="px-3 py-2.5 flex items-center gap-3">
            <Avatar name={m.name} hue={m.hue} size={30} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{m.name}</div>
              <div className="text-xs text-ink-3 tnum">
                {pounds(b.charged)} charged · {pounds(b.paid)} paid
              </div>
            </div>
            {b.owed > 0 ? <Pill tone="bad">Owes {pounds(b.owed)}</Pill> : b.owed < 0 ? <Pill tone="good">Credit {pounds(-b.owed)}</Pill> : <Pill tone="good">Settled</Pill>}
            {isOrganiser && b.owed > 0 ? (
              <ActionForm action={recordPayment} className="gap-0">
                <input type="hidden" name="crewId" value={crew.id} />
                <input type="hidden" name="userId" value={m.id} />
                <input type="hidden" name="amount" value={pounds(b.owed).slice(1)} />
                <input type="hidden" name="method" value="transfer" />
                <SubmitButton variant="secondary" className="min-h-8 px-2 text-xs" pendingText="…">
                  Paid up
                </SubmitButton>
              </ActionForm>
            ) : null}
          </div>
        ))}
      </Panel>

      {isOrganiser ? (
        <Panel className="p-4 mb-4">
          <div className="eyebrow mb-2">Record a payment</div>
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

      <details className="border border-line rounded-md">
        <summary className="px-3 py-2.5 text-sm font-semibold cursor-pointer">Every entry ({entries.length})</summary>
        <ol className="divide-y divide-line-2">
          {entries.map((e) => {
            const m = members.find((x) => x.id === e.userId);
            return (
              <li key={e.id} className="px-3 py-2 flex items-center gap-2 text-sm">
                <span className="eyebrow w-16 shrink-0">{fmtDay(e.createdAt)}</span>
                <span className="flex-1 truncate">
                  <strong>{m?.name ?? "?"}</strong> {e.kind === "charge" ? `charged (${e.reason.replace("_", " ")})` : e.reason === "waived" ? "waived" : `paid by ${e.reason}`}
                  {e.sessionId ? <span className="text-ink-3"> · {sessionName(e.sessionId)}</span> : null}
                  {e.note ? <span className="text-ink-3"> · {e.note}</span> : null}
                </span>
                <span className={`tnum font-semibold ${e.kind === "charge" ? "text-red" : "text-pitch-deep"}`}>
                  {e.kind === "charge" ? "+" : "−"}
                  {pounds(e.amountPence)}
                </span>
                {isOrganiser && e.kind === "payment" ? (
                  <form action={deleteLedgerEntry}>
                    <input type="hidden" name="crewId" value={crew.id} />
                    <input type="hidden" name="entryId" value={e.id} />
                    <Button type="submit" variant="ghost" className="min-h-7 px-1.5 text-xs" aria-label="Undo this payment">
                      Undo
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ol>
      </details>
    </CrewShell>
  );
}
