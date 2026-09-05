import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SPORTS } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { LinkButton, Panel, Pill } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { ChatPreview, HeroCards } from "@/components/hero-cards";

export default async function Landing() {
  const user = await getCurrentUser();
  return (
    <PlainShell user={user} wide>
      <section className="pt-6 pb-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-center">
        <div className="flex flex-col gap-6">
          <div className="eyebrow">For the crew · London first · Football, padel, golf, gym, race weekends</div>
          <h1 className="text-[64px] sm:text-[84px] font-extrabold uppercase leading-[0.88] tracking-tight">
            Who&apos;s actually
            <br />
            turning up?
          </h1>
          <p className="text-lg text-ink-2 max-w-[48ch]">
            Roll Call is the app for your crew, not your sport. Pin the session, everyone taps in from the group chat, the reserve list fills the gap
            when someone drops, and turning up becomes a stat.
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/start" className="text-base px-6 min-h-12">
              Start a crew
            </LinkButton>
            <LinkButton href="/signin" variant="secondary" className="text-base px-6 min-h-12">
              I&apos;ve got an invite
            </LinkButton>
          </div>
          <p className="text-sm text-ink-3">Free for crews. Nobody has to install anything to tap in.</p>
        </div>
        <HeroCards />
      </section>

      <div className="max-w-3xl">
        <Demo />
      </div>

      <section className="py-10 grid gap-6 sm:grid-cols-3 max-w-4xl">
        {[
          ["Pin it", "Venue, time, cost, spots, deadline. Takes less time than typing it into WhatsApp."],
          ["Tap in", "Mates tap in from the link. Full? They're on the reserve list and get promoted when someone drops."],
          ["Turn up", "The organiser confirms who played. Late drops still owe their share. Everyone rates in three taps."],
        ].map(([t, b]) => (
          <div key={t} className="flex flex-col gap-1.5">
            <div className="display text-2xl font-bold uppercase text-pitch-deep">{t}</div>
            <p className="text-ink-2 text-[15px]">{b}</p>
          </div>
        ))}
      </section>

      <section className="py-6 flex flex-col gap-4">
        <div className="eyebrow">Built for the sports your crew actually plays</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(SPORTS).map((s) => (
            <Panel key={s.key} className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="display text-xl font-bold uppercase">{s.label}</span>
                <Pill>{s.games[0] ? s.games[0] : "streaks"}</Pill>
              </div>
              <p className="text-sm text-ink-2">{s.pitch}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="py-10 border-t border-line grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-col gap-3">
          <div className="eyebrow">Growth loop</div>
          <h2 className="text-4xl font-bold uppercase">The card is the ad.</h2>
          <p className="text-ink-2 max-w-[50ch]">
            Every session link previews as a card in WhatsApp: who&apos;s in, spots left, kick-off. After the game it shows who turned up and the
            player of the match. Drop it back into the group and the next crew finds us.
          </p>
        </div>
        <ChatPreview />
      </section>

      <section className="py-10 border-t border-line grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold uppercase">No subscriptions. No hidden fees.</h2>
          <p className="text-ink-2">
            Crews use Roll Call free. When card payments arrive, the fee sits on the session, in plain sight, and only when the crew plays. Sick of
            apps that charge £100 a year to be a scorecard? Same.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold uppercase">Late drops still pay.</h2>
          <p className="text-ink-2">
            Drop out inside the crew&apos;s window and your share stands. Reserves get promoted automatically. It&apos;s the rule every crew already
            wants and nobody wants to enforce by hand.
          </p>
        </div>
      </section>

      <footer className="py-8 border-t border-line text-sm text-ink-3 flex flex-wrap gap-x-6 gap-y-2">
        <span>Roll Call · Made in London</span>
        <Link href="/start">Start a crew</Link>
        <Link href="/signin">Sign in</Link>
        <span>18+ only. Predictions are free to play, no prizes, no stakes.</span>
      </footer>
    </PlainShell>
  );
}

function Demo() {
  const rows = [
    { name: "Josh", hue: 150, turn: "14/14", form: 8.1, pts: 42, tone: "good" as const },
    { name: "Priya", hue: 20, turn: "13/14", form: 7.9, pts: 39, tone: "good" as const },
    { name: "Deano", hue: 260, turn: "11/14", form: 7.4, pts: 31, tone: "warn" as const },
    { name: "Jonesy", hue: 330, turn: "5/14", form: 6.2, pts: 11, tone: "bad" as const },
  ];
  return (
    <Panel className="p-4 sm:p-5 flex flex-col gap-4" as="div">
      <div className="flex items-baseline justify-between">
        <span className="display text-2xl font-bold uppercase">Tuesday FC</span>
        <span className="eyebrow">Wk 14 · 12 members</span>
      </div>
      <div className="bg-pitch-soft rounded-sm p-3 grid grid-cols-[1fr_auto] gap-3 items-center">
        <div>
          <div className="font-semibold">5-a-side · Powerleague Shoreditch</div>
          <div className="text-sm text-ink-2">Tue 8 Sep · 20:00 · £6.50 each</div>
        </div>
        <div className="text-right">
          <div className="display text-4xl font-bold leading-none tnum">9</div>
          <div className="eyebrow">in / 10</div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="eyebrow text-left">
            <th className="font-normal pb-1">Player</th>
            <th className="font-normal pb-1">Turns up</th>
            <th className="font-normal pb-1">Form</th>
            <th className="font-normal pb-1 text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-line-2">
              <td className="py-2 flex items-center gap-2">
                <Avatar name={r.name} hue={r.hue} size={26} />
                {r.name}
              </td>
              <td>
                <Pill tone={r.tone}>{r.turn}</Pill>
              </td>
              <td className="tnum">{r.form.toFixed(1)}</td>
              <td className="tnum text-right font-semibold">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-3">Example crew. &quot;Turns up&quot; counts confirmed attendance; late drops still pay under the crew&apos;s 24-hour rule.</p>
    </Panel>
  );
}
