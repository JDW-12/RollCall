import { PlayerCard } from "./player-card";
import { SPORTS } from "@/domain/sports";
import { LogoMark } from "./logo";

/**
 * Three example cards fanned like a hand under a floodlight. Real component, example numbers.
 * Only the organiser's card in the middle tracks the pointer; the wings stay still so the fan reads as one object.
 */
export function HeroCards() {
  const cats = SPORTS.football.ratings;
  const cards = [
    { name: "Priya Shah", hue: 20, card: { turnsUp: 95, form: 82, votes: 81, graft: 69, streak: 99, overall: 88 }, rank: 2, points: 105, tilt: -9 },
    { name: "Josh", hue: 150, card: { turnsUp: 99, form: 78, votes: 99, graft: 99, streak: 99, overall: 93 }, rank: 1, points: 127, tilt: 0 },
    { name: "Jonesy", hue: 330, card: { turnsUp: 51, form: 55, votes: 45, graft: 45, streak: 45, overall: 49 }, rank: 12, points: 4, tilt: 9 },
  ];
  return (
    <div className="relative h-[340px] sm:h-[430px] w-full max-w-[540px] mx-auto overflow-visible scale-[0.78] sm:scale-100 origin-top" aria-hidden="true">
      {/* A tighter floodlight behind the fan, on top of the page-wide glow. */}
      <div
        className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[620px] h-[520px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(closest-side, var(--pitch-glow), transparent 72%)", filter: "blur(6px)" }}
      />
      {cards.map((c, i) => (
        <div
          key={c.name}
          className={i === 1 ? "absolute w-[260px] anim-rise" : i === 0 ? "absolute w-[260px] anim-rise-2" : "absolute w-[260px] anim-rise-3"}
          style={{ left: `calc(50% - 130px + ${(i - 1) * 118}px)`, top: i === 1 ? 0 : 26, zIndex: i === 1 ? 2 : 1, transformOrigin: "50% 120%" }}
        >
          <div style={{ transform: `rotate(${c.tilt}deg)` }}>
            <PlayerCard
              name={c.name}
              hue={c.hue}
              crewName="Tuesday FC"
              sport="football"
              sportLabel="Football"
              card={c.card}
              rank={c.rank}
              categories={cats}
              points={c.points}
              season="Autumn 2026"
              tilt={i === 1}
              className={i === 1 ? "surface-raised" : undefined}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* WhatsApp dark-mode colours, fixed on purpose: this is a picture of someone else's app, not our theme. */
const WA = { ground: "#0b141a", bubble: "#005c4b", ink: "#e9edef", meta: "#8696a0" };
/* The link preview inside stays light so it reads as a card sitting in the chat, whatever theme the page is in. */
const PREVIEW = { ground: "#f5f6f2", ink: "#14201b", ink2: "#3e4a44", ink3: "#6e7a73", pitch: "#1e8a4c" };

/** A WhatsApp-style message with the link preview a session card produces. Static, for the landing page. */
export function ChatPreview() {
  return (
    <div className="rounded-lg p-3 max-w-[380px] w-full shadow-[var(--shadow)]" style={{ background: WA.ground }} aria-hidden="true">
      <div className="flex items-center gap-2 px-1 pb-2.5 font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: WA.meta }}>
        <span className="w-5 h-5 rounded-full inline-flex items-center justify-center font-display font-bold text-[10px] normal-case tracking-normal" style={{ background: "oklch(0.82 0.09 150)", color: "oklch(0.28 0.08 150)" }}>
          T
        </span>
        Tuesday FC · 12 members
      </div>
      <div className="ml-8 rounded-lg rounded-tr-sm p-1.5 shadow-sm" style={{ background: WA.bubble, color: WA.ink }}>
        <div className="rounded-md overflow-hidden" style={{ background: PREVIEW.ground, color: PREVIEW.ink }}>
          <div className="p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: PREVIEW.ink3 }}>
              <span>Tuesday FC · Football</span>
              <span className="flex items-center gap-1">
                <LogoMark size={12} /> Roll Call
              </span>
            </div>
            <div className="display text-[26px] font-extrabold uppercase leading-none">Tuesday 5s · Wk 15</div>
            <div className="text-[12px]" style={{ color: PREVIEW.ink2 }}>
              Tuesday 8 September at 20:00 · Powerleague Shoreditch
            </div>
            <div className="flex items-end justify-between gap-3 mt-2">
              <div className="min-w-0">
                <div className="font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: PREVIEW.pitch }}>
                  1 spot left
                </div>
                <div className="font-semibold text-[13px]">Sam · Priya · Tom · Ash · Marcus · Leon</div>
              </div>
              <div className="rounded-md px-3 py-1.5 text-right shrink-0" style={{ background: PREVIEW.pitch, color: "#fff" }}>
                <div className="display text-3xl font-extrabold leading-none tnum">9</div>
                <div className="font-mono text-[9px] tracking-[0.12em] uppercase opacity-90">in / 10</div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-1.5 pt-1.5 text-[13px]">Wk 15 is up. One spot left, tap in 👇</div>
        <div className="text-right text-[10px] pr-1.5 pb-0.5" style={{ color: WA.meta }}>
          19:42 · read
        </div>
      </div>
      <div className="ml-8 mt-1.5 flex gap-1.5 text-[11px]" style={{ color: WA.meta }}>
        <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
          👍 3
        </span>
        <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
          ⚽ 2
        </span>
      </div>
    </div>
  );
}
