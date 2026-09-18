# Roll Call

**The app for your crew, not your sport.**

Roll Call is for the weekly group of 4 to 20 mates who play 5-a-side, book a padel court, play a fourball, train together or watch the race on Sunday. Today that group runs on WhatsApp and bank transfers. Roll Call is the thing that gets pinned at the top of the chat.

The loop:

1. **Pin it.** The organiser pins a session: venue, time, cost, spots, commit-by deadline.
2. **Tap in.** Mates tap in from a share link. No install, no sign-up, just a name. Full? They join the reserve list and get promoted automatically when someone drops.
3. **Turn up.** The organiser confirms who played. Late drops (inside the crew's window, default 24 hours) and no-shows still owe their share.
4. **Rate it.** Everyone who played votes in three taps: player of the match, ran the hardest, worst miss. Wording changes per sport.

That feeds a season-long crew table (+3 turned up, +2 per top vote, +1 per grafter vote, −2 late drop, −3 no-show), form, streaks, a "Sick Notes" leaderboard, FIFA-style peer-rated player cards, and share cards that render as link previews in WhatsApp.

Side games ship per sport: a form-balanced team picker for football, an americano generator and scoreboard for padel, a Stableford card for golf, and a free podium predictor for race weekends.

Built for the UK. Money in pounds and pence, times in Europe/London, predictions free with no prizes so the Gambling Act stays out of it.

## Run it

Requires Node 22.

```bash
cd rollcall
npm install
cp .env.example .env
npm run db:seed        # creates data/rollcall.db and a demo crew with 14 weeks of history
npm run dev            # http://localhost:3000
```

The seed prints two ready-made login cookies (organiser and member) and an invite link. Or sign in with `josh@example.com`: without an email provider configured, the six-digit code is printed to the server console.

Demo crews:

- `/crew/tuesday-fc` – 12-a-side football crew, 14 played sessions, one upcoming, money partly settled.
- `/crew/battersea-padel` – padel four with one upcoming match and a reserve waiting.
- `/join/tuesdayfc-demo-invite` – the zero-install join flow.

## Growth loop and pilot dashboard

Shared session and player links open for anyone as a poster with a join action. "Start your own crew" from a preview records the referral. `/crew/<slug>/season` is the shareable awards page. `/founder` (gated by `FOUNDER_EMAILS`) shows the pilot metrics from `docs/metrics.md`.

## Deploy

See [docs/deployment.md](docs/deployment.md). With no database configured on Vercel the app runs in a clearly-labelled sandbox mode with demo data and one-tap sign-in at `/demo`, so it can be tried immediately; add a Turso `DATABASE_URL` for real data.

## Checks

```bash
npm run check          # typecheck + lint + unit tests
npm run test:e2e       # Playwright: full loop as three people, plus guards
npm run build
```

Unit tests cover the domain rules (RSVP and reserve promotion, late drops, exact money splitting, points and form, team balancing, americano rotation, Stableford, predictor scoring). The end-to-end test runs the whole product as an organiser and two mates in separate browser contexts, through to the table, the ledger and the share-card images.

In sandboxes that ship their own Chromium, set `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium`.

## Stack

- Next.js 16 (App Router, server actions, `next/og` for share cards), React 19, TypeScript
- Tailwind CSS 4 on a small token set (light and dark)
- Drizzle ORM on libsql. SQLite file locally, Turso or any libsql server in production
- Zod for input validation, Vitest for units, Playwright for end to end
- No client state library. Almost every screen is a server component with one or two small client islands.

## Layout

```
src/domain/     pure rules: sports, rsvp, money, table, teams, americano, stableford, predictor (+ tests)
src/db/         Drizzle schema and client (auto-migrates on first connection)
src/lib/        auth, access control, queries, formatting, server actions
src/components/ shared UI, shells, game panels, share buttons
src/app/        routes: landing, start, signin, home, join, me, crew/[slug]/...
scripts/        migrate and seed
drizzle/        generated SQL migrations
docs/           product spec, architecture, design system, business plan, GTM, legal, roadmap, metrics, deployment
e2e/            Playwright
```

## Docs

- [Product spec](docs/product-spec.md)
- [Architecture](docs/architecture.md)
- [Design system](docs/design-system.md)
- [Deployment](docs/deployment.md)
- [Business plan](docs/business-plan.md), [London go-to-market](docs/go-to-market-london.md), [Metrics](docs/metrics.md)
- [Legal and compliance](docs/legal-and-compliance.md) (not legal advice)
- [Roadmap](docs/roadmap.md)

## What v1 deliberately does not do

- No card payments yet. The ledger is real and exact; settling is "mark as paid". Stripe Connect pass-through is next, so Roll Call never holds anyone's money.
- No chat. WhatsApp is the chat. Roll Call is the pinned message.
- No player-finder for strangers. A crew brings its own people.
- No venue booking. Sessions link out; booking deep-links are on the roadmap.
- No push or email reminders yet. Share cards into the group do that job for now.
