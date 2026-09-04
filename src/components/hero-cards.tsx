import { PlayerCard } from "./player-card";
import { SPORTS } from "@/domain/sports";
import { LogoMark } from "./logo";

/** Three example cards fanned like a hand. Real component, example numbers. */
export function HeroCards() {
  const cats = SPORTS.football.ratings;
  const cards = [
    { name: "Priya Shah", hue: 20, card: { turnsUp: 95, form: 82, votes: 81, graft: 69, streak: 99, overall: 88 }, rank: 2, points: 105, tilt: -8 },
    { name: "Sam Okafor", hue: 150, card: { turnsUp: 99, form: 78, votes: 99, graft: 99, streak: 99, overall: 93 }, rank: 1, points: 127, tilt: 0 },
    { name: "Jonesy", hue: 330, card: { turnsUp: 51, form: 55, votes: 45, graft: 45, streak: 45, overall: 49 }, rank: 12, points: 4, tilt: 8 },
  ];
  return (
    <div className="relative h-[430px] w-full max-w-[540px] mx-auto overflow-visible" aria-hidden="true">
      {cards.map((c, i) => (
        <div
          key={c.name}
          className="absolute top-0 w-[260px]"
          style={{ left: `calc(50% - 130px + ${(i - 1) * 118}px)`, top: i === 1 ? 0 : 26, zIndex: i === 1 ? 2 : 1, transformOrigin: "50% 120%" }}
        >
          <PlayerCard name={c.name} hue={c.hue} crewName="Tuesday FC" sportLabel="Football" card={c.card} rank={c.rank} categories={cats} points={c.points} tilt={c.tilt} />
        </div>
      ))}
    </div>
  );
}

/** A WhatsApp-style message with the link preview a session card produces. Static, for the landing page. */
export function ChatPreview() {
  return (
    <div className="rounded-md p-3 bg-[#e5ddd5] dark:bg-[#0b141a] max-w-[380px]" aria-hidden="true">
      <div className="rounded-lg bg-[#dcf8c6] dark:bg-[#005c4b] text-[#111] dark:text-[#e9edef] p-2 shadow-sm">
        <div className="rounded-md overflow-hidden border border-black/10 dark:border-white/10 bg-[#f5f6f2] text-[#14201b]">
          <div className="p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.12em] uppercase text-[#6e7a73]">
              <span>Tuesday FC · Football</span>
              <span className="flex items-center gap-1">
                <LogoMark size={12} /> Roll Call
              </span>
            </div>
            <div className="display text-[26px] font-extrabold uppercase leading-none">Tuesday 5s · Wk 15</div>
            <div className="text-[12px] text-[#3e4a44]">Tuesday 8 September at 20:00 · Powerleague Shoreditch</div>
            <div className="flex items-end justify-between mt-2">
              <div>
                <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-[#6e7a73]">1 spot left</div>
                <div className="font-semibold text-[13px]">Sam · Priya · Tom · Ash · Marcus · Leon</div>
              </div>
              <div className="bg-[#1e8a4c] text-white rounded-md px-3 py-1.5 text-right">
                <div className="display text-3xl font-extrabold leading-none">9</div>
                <div className="font-mono text-[9px] tracking-[0.12em] uppercase opacity-90">in / 10</div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-1 pt-1.5 text-[13px]">Wk 15 is up. One spot left, tap in 👇</div>
        <div className="text-right text-[10px] opacity-60 pr-1">19:42 ✓✓</div>
      </div>
    </div>
  );
}
