import type { Game } from "@/db/schema";
import type { Teams } from "@/domain/teams";
import type { Member } from "@/lib/queries";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { Panel } from "@/components/ui";
import { makeTeams } from "@/lib/actions/games";

export function TeamsPanel({ sessionId, game, members, isOrganiser, inCount }: { sessionId: string; game?: Game; members: Member[]; isOrganiser: boolean; inCount: number }) {
  const teams = game ? (JSON.parse(game.data) as Teams) : null;
  const m = (id: string) => members.find((x) => x.id === id);
  return (
    <Panel className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold uppercase">Teams</h3>
        {isOrganiser ? (
          <ActionForm action={makeTeams} className="gap-0">
            <input type="hidden" name="sessionId" value={sessionId} />
            <SubmitButton variant="secondary" className="min-h-9 px-3 text-sm" pendingText="Picking…">
              {teams ? "Re-pick" : "Pick teams"}
            </SubmitButton>
          </ActionForm>
        ) : null}
      </div>
      {!teams ? (
        <p className="text-sm text-ink-2">Balanced on form, so the same two lads don&apos;t win every week. {inCount < 2 ? "Needs at least two in." : ""}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {(["a", "b"] as const).map((side) => (
            <div key={side} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="display text-lg font-bold uppercase">{side === "a" ? "Bibs" : "Non-bibs"}</span>
                <span className="eyebrow">form {side === "a" ? teams.formA.toFixed(1) : teams.formB.toFixed(1)}</span>
              </div>
              {teams[side].map((id) => {
                const p = m(id);
                return p ? (
                  <div key={id} className="flex items-center gap-2 text-sm">
                    <Avatar name={p.name} hue={p.hue} size={24} />
                    <span className="truncate">{p.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
