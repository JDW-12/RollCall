import type { RatingCategory } from "@/domain/sports";
import { FlagEmblem } from "./marks";

/**
 * Every way a golfer earns points on the board, printed like the local rules on the back of a
 * scorecard. The Stableford rows mirror stablefordPoints (2 + par - net, floored at zero); the vote
 * rows come from the crew's own categories, so a renamed or re-weighted vote shows as it's scored.
 */

const CARD_ROWS: [string, string, string][] = [
  ["Net albatross or better", "3 under par", "5+"],
  ["Net eagle", "2 under par", "4"],
  ["Net birdie", "1 under par", "3"],
  ["Net par", "level", "2"],
  ["Net bogey", "1 over par", "1"],
  ["Net double bogey or worse", "2+ over par", "0"],
  ["Hole not played or picked up", "", "0"],
];

export function PointsExplained({ categories }: { categories: RatingCategory[] }) {
  const td = "px-3 py-2 align-top";
  const pts = "px-3 py-2 text-right display text-lg font-extrabold tabular-nums align-top w-16";
  const line = { borderTop: "1px solid var(--gf-paper-line)" };
  const section = (title: string, note: string) => (
    <tr style={{ background: "var(--gf-paper-2)", ...line }}>
      <th colSpan={2} scope="colgroup" className="px-3 pt-2.5 pb-2 text-left">
        <span className="block display text-base font-extrabold uppercase tracking-[0.04em]">{title}</span>
        <span className="block text-xs font-normal mt-0.5" style={{ color: "var(--gf-paper-ink-2)" }}>
          {note}
        </span>
      </th>
    </tr>
  );

  return (
    <section className="rounded-md overflow-hidden shadow-[var(--shadow)] ring-1 ring-black/20" style={{ background: "var(--gf-paper)", color: "var(--gf-paper-ink)" }} aria-labelledby="points-explained">
      <header className="flex items-center gap-2 px-3 py-2.5" style={{ background: "linear-gradient(180deg, #2b7a44, #1f6437)", color: "#f6f3ea" }}>
        <FlagEmblem size={24} className="shrink-0" />
        <div className="leading-tight">
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-80">Local rules</div>
          <h2 id="points-explained" className="display text-xl font-extrabold uppercase">
            Points explained
          </h2>
        </div>
      </header>

      <table className="w-full text-sm">
        <caption className="sr-only">Every way to score points on the leader board</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">How</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {section("From your card: Stableford", "Every hole scores. Your playing handicap gives you shots on the hardest holes first (stroke index 1 is the hardest; more shots than holes means two on the hardest). Take them off your strokes for your net score.")}
          {CARD_ROWS.map(([label, detail, p]) => (
            <tr key={label} style={line}>
              <td className={td}>
                <span className="font-semibold">{label}</span>
                {detail ? <span style={{ color: "var(--gf-paper-ink-2)" }}> · {detail}</span> : null}
                {p === "5+" ? (
                  <span className="block text-xs mt-0.5" style={{ color: "var(--gf-paper-ink-2)" }}>
                    Plus one more for every shot better.
                  </span>
                ) : null}
              </td>
              <td className={pts}>{p}</td>
            </tr>
          ))}
          <tr style={line}>
            <td colSpan={2} className="px-3 py-2 text-xs" style={{ color: "var(--gf-paper-ink-2)" }}>
              <strong style={{ color: "var(--gf-paper-ink)" }}>Example:</strong> par 4, stroke index 5, playing handicap 13. You get a shot on this hole, so a 5 is a net par: 2 points.
            </td>
          </tr>

          {section("From the crew: votes", "After the round everyone votes. Each vote you get adds its points to that round.")}
          {categories.map((c) => (
            <tr key={c.key} style={line}>
              <td className={td}>
                <span className="font-semibold">{c.label}</span>
                <span style={{ color: "var(--gf-paper-ink-2)" }}> · per vote</span>
                {c.points === 0 ? (
                  <span className="block text-xs mt-0.5" style={{ color: "var(--gf-paper-ink-2)" }}>
                    Bragging rights only.
                  </span>
                ) : null}
              </td>
              <td className={pts}>{c.points > 0 ? `+${c.points}` : "0"}</td>
            </tr>
          ))}

          {section("Doesn't score", "Golf is settled on the card, not the register.")}
          <tr style={line}>
            <td className={td}>
              <span className="font-semibold">Turning up, dropping out or a no-show</span>
            </td>
            <td className={pts}>0</td>
          </tr>
        </tbody>
      </table>

      <footer className="px-3 py-2.5 text-xs leading-relaxed" style={{ borderTop: "1px dashed var(--gf-paper-line)", color: "var(--gf-paper-ink-2)" }}>
        <strong style={{ color: "var(--gf-paper-ink)" }}>Round total</strong> = Stableford + votes. <strong style={{ color: "var(--gf-paper-ink)" }}>Season</strong> = every round added up. Level on points shows as a tie (T2).
      </footer>
    </section>
  );
}
