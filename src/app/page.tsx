import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCrewsForUser } from "@/lib/queries";
import { requestCode } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SPORTS } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { LinkButton, Pill } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { Ring } from "@/components/ring";
import { FormDots } from "@/components/sparkline";
import { Wordmark } from "@/components/logo";
import { IconCheck, IconClock, IconCoins, IconPin, IconTrophy, IconWhistle, SportIcon } from "@/components/icons";
import { ChatPreview, HeroCards } from "@/components/hero-cards";

export default async function Landing() {
  const user = await getCurrentUser();
  // Already in: the link is a way back to the crew, not a sales page. One crew goes straight to its
  // dashboard; more than one goes to the list of them.
  if (user) {
    const crews = await listCrewsForUser(user.id);
    redirect(crews.length === 1 ? `/crew/${crews[0].slug}` : "/home");
  }
  return (
    <PlainShell user={user} wide>
      <SignInBox />
      {/* Hero */}
      <section className="pt-4 sm:pt-8 pb-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-center">
        <div className="flex flex-col gap-6">
          <div className="eyebrow anim-rise">For the crew · London first · Football, padel, golf, gym, race weekends</div>
          <h1 className="text-[64px] sm:text-[92px] font-extrabold uppercase leading-[0.86] tracking-tight anim-rise">
            Who&apos;s actually
            <br />
            <span className="text-pitch">turning up?</span>
          </h1>
          <p className="text-lg text-ink-2 max-w-[46ch] anim-rise-2">
            Roll Call is the app for your crew, not your sport. Pin the session, everyone taps in from the group chat, the reserve list fills the gap
            when someone drops, and turning up becomes a stat.
          </p>
          <div className="flex flex-wrap gap-3 anim-rise-3">
            <LinkButton href="/start" className="text-base px-6 min-h-12">
              Start a crew
            </LinkButton>
            <LinkButton href="/signin" variant="secondary" className="text-base px-6 min-h-12">
              I&apos;ve got an invite
            </LinkButton>
          </div>
          <p className="text-sm text-ink-3 anim-rise-3">Free for crews. Nobody has to install anything to tap in.</p>
        </div>
        <HeroCards />
      </section>

      {/* Sports strip */}
      <section className="py-6 flex flex-col gap-3">
        <div className="eyebrow">Built for the sports your crew actually plays</div>
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:mx-0 lg:px-0">
          {Object.values(SPORTS).map((s) => (
            <div key={s.key} className="surface snap-start shrink-0 w-[240px] lg:w-auto p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-md bg-pitch-soft text-pitch flex items-center justify-center">
                  <SportIcon sport={s.key} size={22} />
                </span>
                <span className="eyebrow">{s.games[0] ?? "streaks"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="display text-2xl font-bold uppercase">{s.label}</span>
                <p className="text-sm text-ink-2">{s.pitch}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The loop */}
      <section className="py-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="eyebrow">The loop</div>
          <h2 className="text-4xl sm:text-5xl font-bold uppercase">One link. Four taps. Every week.</h2>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", t: "Pin it", Icon: IconPin, b: "Venue, time, cost, spots, deadline. Takes less time than typing it into WhatsApp." },
            { n: "02", t: "Tap in", Icon: IconCheck, b: "Mates tap in from the link. Full? They're on the reserve list and get promoted when someone drops." },
            { n: "03", t: "Turn up", Icon: IconWhistle, b: "The organiser confirms who played. Late drops still owe their share. Nobody argues." },
            { n: "04", t: "Get rated", Icon: IconTrophy, b: "Three taps after the game. Player of the match, grafter, howler. Cards and the table move." },
          ].map((s) => (
            <li key={s.n} className="surface p-5 flex flex-col gap-4 relative overflow-hidden">
              <span className="display text-[88px] font-extrabold leading-none text-ink-3/20 absolute -top-3 right-3 select-none tnum" aria-hidden="true">
                {s.n}
              </span>
              <span className="w-11 h-11 rounded-md bg-pitch text-pitch-ink flex items-center justify-center relative">
                <s.Icon size={22} />
              </span>
              <div className="flex flex-col gap-1.5 relative">
                <span className="display text-2xl font-bold uppercase">
                  <span className="text-pitch tnum">{s.n}</span> {s.t}
                </span>
                <p className="text-ink-2 text-[15px]">{s.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Demo table */}
      <section className="py-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col gap-3 lg:order-2">
          <div className="eyebrow">The table</div>
          <h2 className="text-4xl sm:text-5xl font-bold uppercase">Turning up is a stat now.</h2>
          <p className="text-ink-2 max-w-[48ch]">
            Every crew gets a live table. Attendance, form from peer votes, points, streaks. The regulars finally get credit, and the sick-note merchants get a leaderboard of their own.
          </p>
        </div>
        <div className="lg:order-1">
          <Demo />
        </div>
      </section>

      {/* The card is the ad */}
      <section className="py-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex flex-col gap-3">
          <div className="eyebrow">Growth loop</div>
          <h2 className="text-4xl sm:text-5xl font-bold uppercase">The card is the ad.</h2>
          <p className="text-ink-2 max-w-[50ch]">
            Every session link previews as a card in WhatsApp: who&apos;s in, spots left, kick-off. After the game it shows who turned up and the
            player of the match. Drop it back into the group and the next crew finds us.
          </p>
        </div>
        <ChatPreview />
      </section>

      {/* Money rules */}
      <section className="py-6 grid gap-4 sm:grid-cols-2">
        <div className="surface p-5 sm:p-6 flex flex-col gap-4">
          <span className="w-11 h-11 rounded-md bg-pitch-soft text-pitch flex items-center justify-center">
            <IconCoins size={22} />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold uppercase">No subscriptions. No hidden fees.</h2>
            <p className="text-ink-2">
              Crews use Roll Call free. When card payments arrive, the fee sits on the session, in plain sight, and only when the crew plays. Sick of
              apps that charge £100 a year to be a scorecard? Same.
            </p>
          </div>
        </div>
        <div className="surface p-5 sm:p-6 flex flex-col gap-4">
          <span className="w-11 h-11 rounded-md bg-pitch-soft text-pitch flex items-center justify-center">
            <IconClock size={22} />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold uppercase">Late drops still pay.</h2>
            <p className="text-ink-2">
              Drop out inside the crew&apos;s window and your share stands. Reserves get promoted automatically. It&apos;s the rule every crew already
              wants and nobody wants to enforce by hand.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA band: bleeds to the edge on mobile, a wide block on desktop */}
      <section className="mt-8 -mx-4 sm:mx-0 sm:rounded-lg bg-pitch text-pitch-ink relative overflow-hidden">
        <div className="absolute inset-0 pitch-lines opacity-60" aria-hidden="true" />
        <div className="relative px-6 py-12 sm:px-12 sm:py-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="eyebrow text-pitch-ink/70">Free for crews</div>
            <h2 className="text-[52px] sm:text-[72px] font-extrabold uppercase leading-[0.88] tracking-tight">
              Get them
              <br />
              on the pitch.
            </h2>
            <p className="text-pitch-ink/80 max-w-[40ch]">Takes a minute. Share one link. Your crew does the rest from the group chat.</p>
          </div>
          <Link href="/start" className="press inline-flex items-center justify-center min-h-12 px-7 rounded-md bg-ink text-ground font-semibold text-base whitespace-nowrap self-start sm:self-end">
            Start a crew
          </Link>
        </div>
      </section>

      <footer className="pt-10 pb-6 flex flex-col gap-4 text-sm text-ink-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Wordmark size={22} className="text-ink" />
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-semibold text-ink-2">
            <Link href="/start">Start a crew</Link>
            <Link href="/signin">Sign in</Link>
            <Link href="/home">Your crews</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-4">
          <span>Roll Call · Made in London</span>
          <span>18+ only. Predictions are free to play, no prizes, no stakes.</span>
        </div>
      </footer>
    </PlainShell>
  );
}

function Demo() {
  const rows = [
    { name: "Josh", hue: 150, turn: "14/14", form: 8.1, pts: 42, tone: "good" as const, history: ["played", "played", "played", "played", "played"] as const },
    { name: "Priya", hue: 20, turn: "13/14", form: 7.9, pts: 39, tone: "good" as const, history: ["played", "played", "skip", "played", "played"] as const },
    { name: "Deano", hue: 260, turn: "11/14", form: 7.4, pts: 31, tone: "warn" as const, history: ["played", "missed", "played", "played", "skip"] as const },
    { name: "Jonesy", hue: 330, turn: "5/14", form: 6.2, pts: 11, tone: "bad" as const, history: ["missed", "skip", "missed", "played", "missed"] as const },
  ];
  return (
    <div className="surface surface-raised p-4 sm:p-5 flex flex-col gap-4 max-w-xl">
      <div className="flex items-baseline justify-between">
        <span className="display text-2xl font-bold uppercase">Tuesday FC</span>
        <span className="eyebrow">Wk 14 · 12 members</span>
      </div>
      <div className="bg-pitch-soft border border-pitch/20 rounded-md p-3 grid grid-cols-[1fr_auto] gap-3 items-center">
        <div className="min-w-0">
          <div className="eyebrow text-pitch">Next up · 1 spot left</div>
          <div className="font-semibold mt-0.5">5-a-side · Powerleague Shoreditch</div>
          <div className="text-sm text-ink-2">Tue 8 Sep · 20:00 · £6.50 each</div>
        </div>
        <Ring value={9} max={10} size={68} sub="of 10" />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="eyebrow text-left">
            <th className="font-normal pb-1">Player</th>
            <th className="font-normal pb-1">Turns up</th>
            <th className="font-normal pb-1 hidden sm:table-cell">Last 5</th>
            <th className="font-normal pb-1">Form</th>
            <th className="font-normal pb-1 text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className="border-t border-line-2">
              <td className="py-2.5">
                <span className="flex items-center gap-2">
                  <span className="display text-ink-3 w-4 tnum">{i + 1}</span>
                  <Avatar name={r.name} hue={r.hue} size={26} />
                  <span className="font-semibold">{r.name}</span>
                </span>
              </td>
              <td>
                <Pill tone={r.tone}>{r.turn}</Pill>
              </td>
              <td className="hidden sm:table-cell">
                <FormDots history={[...r.history]} />
              </td>
              <td className="tnum">{r.form.toFixed(1)}</td>
              <td className="tnum text-right display text-lg font-bold">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-3">Example crew. &quot;Turns up&quot; counts confirmed attendance; late drops still pay under the crew&apos;s 24-hour rule.</p>
    </div>
  );
}


/**
 * The front door: sign in right at the top, before any of the pitch. Same email-code flow as /signin;
 * after the code it comes back here, which forwards to the crew.
 */
function SignInBox() {
  return (
    <section className="surface surface-raised p-4 sm:p-5 mt-2 mb-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,420px)] sm:items-center anim-rise" aria-labelledby="signin-box">
      <div className="flex flex-col gap-1">
        <h2 id="signin-box" className="text-2xl font-bold uppercase leading-none">
          Sign in
        </h2>
        <p className="text-sm text-ink-2">No password: we email you a six-digit code and take you to your crew.</p>
        <p className="text-sm text-ink-3">
          New here?{" "}
          <Link href="/start" className="underline underline-offset-2 text-ink">
            Start a crew
          </Link>{" "}
          or open the invite link your organiser sent.
        </p>
      </div>
      <ActionForm action={requestCode}>
        <input type="hidden" name="next" value="/" />
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <label className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="text-sm font-semibold">Email</span>
            <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" className="text-base" />
          </label>
          <SubmitButton pendingText="Sending…" className="min-h-12 shrink-0">
            Email me a code
          </SubmitButton>
        </div>
      </ActionForm>
    </section>
  );
}
