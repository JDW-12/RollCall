# To do

Status: working list, 24 September 2026. The roadmap says where Roll Call is going; this says what to do next and in what order. Sources: the AI coach and match-analysis ideas (September 2026), and an app audit on 24 September covering product, engineering, and security and privacy.

**Priority key**

- **P0**: fix before inviting more people. Money, data or trust at risk.
- **P1**: next, in order.
- **P2**: big bets. Build after P1, one at a time.
- **Parked**: agreed, not now.

**One rule for this list: finish before starting.** Several big features are part-built at once (golf GPS with no map key or hole data, football redesign paused, sign-in pending). Groundbreaking comes from one loop that works every single week, not ten that work 70% of the time. Nothing in P2 starts until P0 is clear and golf is finished.

---

## Decisions waiting on you

- [ ] **AI coach phase 1 scope.** Golf and gym first, football tagged-clip analysis next?
- [ ] **How the coach is paid for.** Free in the pilot with a daily message cap, or a paid coach pass? A pass needs the roadmap's "No subscriptions" non-goal changed (a season pass priced once fits the existing "priced per season" idea). Football match reports are the most natural thing to charge clubs for.
- [ ] **Coach model.** Top model everywhere (best advice, about 5× the cost), or a cheaper, faster one for in-round tips and the top one for coaching and match reports?
- [ ] **Golf GPS data.** Stay on OpenStreetMap (free, missing at Griffin) or trial a paid provider (Golf Intelligence has a free trial; paid starts at $49 a month).

## Waiting on you (settings, not code)

- [ ] Add `MAPTILER_KEY` to the **rollcall** project, **Production** environment, in Vercel, then redeploy. The play screen still reports no map key on production.
- [ ] When the coach is agreed: check `ANTHROPIC_API_KEY` is set for Production (it already powers scorecard scanning). Enter keys in Vercel only, never in chat.
- [ ] Register with the ICO before the pilot grows (a UK GDPR requirement already noted in `legal-and-compliance.md`).

---

## P0: fix now

Found in the 24 September audit. Most are small.

### Bugs

- [ ] **Golf play mode: "Last hole done" does nothing.** On the last hole the button has no action. It should finish the round and go to the scorecard.
- [ ] **Race weekend and padel crews get a football League tab** (goals, assists, fixtures) because their sport config carries a governing-body link. Show League only for football.
- [ ] **The race-weekend predictor locks at the session start** (watch-party time), not lights out, and its F1 grid is hard-coded.

### Reliability

- [ ] **Run migrations at deploy, not on every cold start.** Two instances starting together can both try the same migration. A failed start is cached and breaks that instance until it's recycled. Also clear the cached connection on failure.
- [ ] **Reminder emails can go twice, or not at all.** Record each recipient before sending with a unique key. Treat a Resend failure as not sent. Send in batches.
- [ ] **Put functions in London** (`"regions": ["lhr1"]` in `vercel.json`). They probably run in Washington while the database is in London, adding a transatlantic round trip to every query.
- [ ] **CI on every push**: typecheck, lint, unit tests, end-to-end. Today `main` deploys with no checks.
- [ ] **Error pages and error tracking**: `error.tsx`, `global-error.tsx`, `not-found.tsx`, plus Sentry or similar, so failures are seen before users report them.
- [ ] **Check Turso enforces foreign keys.** The `PRAGMA` may not carry across connections, so deletes might not cascade.

### Security and privacy

- [ ] **Sign-in codes can be requested without limit.** The "three live codes" throttle can never trigger, because each new code cancels the last. Anyone can flood an inbox, and every new code gives five more guesses. Fix:
  - limit codes created per address per 10 minutes
  - count wrong guesses atomically
  - add a per-IP limit
- [ ] **The season awards page is public** (`/crew/<slug>/season`), and crew slugs are guessable. Anyone can see full names, "Sick note of the season" and links to player vote cards. Make it members-only, or use a random share link with first names and positive awards only.
- [ ] **Open redirect is back.** A tab character in the link (`/go?to=/%09/evil.com`) gets past the check. Resolve the URL and require the same site.
- [ ] **Settings that fail open in production.** Each should fail closed unless an explicit sandbox flag is set:
  - no database URL makes the verify page show anyone's code on screen
  - no founder list lets everyone see the founder dashboard
  - no Resend key writes codes to the logs
- [ ] **Two server functions have no access check.** `ensureCalendarToken` returns a crew's private calendar link; `refreshStripe` is the other. Add the crew check or make them server-only.
- [ ] **Any crew can overwrite a division's shared league table** by pasting one. Only share tables that came from the league's own feed.
- [ ] **Security headers**: stop the pay and RSVP pages being framed (clickjacking), and add a referrer policy.
- [ ] **UK GDPR basics the legal doc already promises**:
  - delete my account ("former member")
  - download my data
  - privacy and terms pages
  - an 18+ check at sign-up
  - a retention purge
  - an opt-out link in reminder emails
  - Anthropic listed as a processor for scorecard scans
- [ ] **Invite-only sessions still leak in three places**: ledger notes on the Money page, the golf leader board and awards ("Round of the season at …"), and predictor picks.
- [ ] Smaller:
  - `/api/track` accepts anything from anyone
  - session tokens stored in plain text, with no "sign out everywhere"
  - player page titles show any user's name
  - rate-limit check-then-write races

---

## P1: next

### 1. Finish golf

- [ ] Map key live on production (see above), and the map checked on a real round.
- [ ] **Offline hole saving.** Course signal drops. Queue scores on the phone and send when back in signal, instead of failing with an error line.
- [ ] Club yardages: a "My bag" page (club → carry distance). This feeds the coach later, and is useful on its own on the play screen ("7 iron gets you there").
- [ ] Hole data where OpenStreetMap has none: decide on a provider (see decisions), or let a player drop tee and green pins once per course for everyone to reuse.
- [ ] Accessibility on the play screen:
  - the yardage overlay re-announces on every GPS fix
  - the stroke count label is ignored by screen readers
  - "Clear target" is too small to tap
- [ ] Then call golf done and move on.

### 2. Get messages to people

Reminders only reach members with an email, and invite-link guests usually have none. That breaks the core loop.

- [ ] **Web push**: a service worker plus push notifications (iPhone supports this once the app is added to the home screen). Use it for new sessions, "are you in?", the deadline, rating after the game, and money owed.
- [ ] **Install prompt** after someone's second session ("Add Roll Call to your home screen").
- [ ] **Ask guests for an email or push permission** after their first session, as the roadmap promises. Today it only lives on `/me`.
- [ ] **The organiser is a guest too** after "Start a crew" (name only). Ask for an email at creation, or they lose the crew with their cookies.
- [ ] Post-game nudges: "rate the game", "you owe £6.50", and a weekly table digest.

### 3. Sign-in

- [ ] Passkeys, with the email code as the fallback.
- [ ] Optional email and password, set up so Apple and Google offer to save it (as agreed, last in this block).

### 4. Per-sport redesigns

Only golf has its own design. The others share one generic crew home.

- [ ] **Football**:
  - its own home
  - keep the team picks after the game
  - results feed player cards (goals, assists)
- [ ] **Padel**:
  - members can enter their own match scores (organiser-only today)
  - Americano results feed the table and cards
  - no League tab
- [ ] **Gym**: nothing gym-specific exists today, just sessions.
  - workout log
  - personal bests
  - training streak
  - this is the base the gym coach needs
- [ ] **Race weekends**:
  - a live F1 calendar and grid
  - predictor points on the table and awards
  - picks lock at lights out

### 5. Promises the docs make that the code doesn't keep

- [ ] **Reporting flow** (roadmap v1): no way to report a person or content.
- [ ] **Ratings opt-out per crew and organiser hide** (roadmap v1 and legal doc): no setting exists.
- [ ] **End or roll over a season**, plus the season-end summary card. The season start is only ever set at crew creation.
- [ ] **Founder metrics from `metrics.md`**:
  - north star
  - time to first pin
  - invite response
  - no-show rate
  - reserve fill
  - retention measured as the doc defines it
- [ ] **WCAG 2.2 AA pass**:
  - tap targets under 44px (compact RSVP, Americano "Save score", several `min-h-9` buttons)
  - form errors not announced
  - player-card codes (TRN, FRM) with no full labels

### 6. Performance and housekeeping

- [ ] **Stop loading a crew's whole history on every page view.** The crew home reads all sessions three times; the dashboard does it per crew; the founder page reads the whole database.
- [ ] **Add missing indexes**:
  - `login_codes.email`
  - `auth_sessions.user_id`
  - `events.session_id` and `events.user_id`
  - user-id columns used by account merge
- [ ] **Nightly purge**: expired sign-in sessions and codes, old analytics events.
- [ ] **Cache the obvious**: course library, calendar feeds.
- [ ] **Backups**: a scheduled Turso export and one restore drill. The ledger is money.
- [ ] **Validate environment variables at start-up** so a missing key fails loudly.
- [ ] **Tests for money and sign-in**: ledger charges and payments, sign-in code attempts and expiry, reminders.

---

## P2: big bets

### AI coach, caddie and PT

One coach for every sport, not separate apps. It knows you, your crew and your season. That's the gap: Arccos, 18Birdies and Golfshot already sell golf AI caddies, and Fitbod and Future sell AI PTs, but none of them know who you play with, your turn-up record, your votes or your league.

**How it's built**

- One coach agent with a shared memory of the player, and a set of tools per sport that read Roll Call's own data:
  - golf: rounds, handicap, bag, hole geometry, weather
  - gym: workout log, plans
  - football and padel: stats, fixtures
- Shows as a slide-in panel during play, a Coach card on the dashboard, and a debrief after each game.
- Text first. Voice uses the phone's built-in speech (free), with premium voices later.
- Weather from Open-Meteo (free, no key).
- Costs are pennies per round, so there's a usage cap or a paid pass (see decisions). Prompt caching keeps repeat context cheap.

**Phase 1: golf and gym, text and voice**

- [ ] My bag: club distances.
- [ ] Handicap and weather in the coach's context.
- [ ] In-round caddie: club and target advice from where you are, the hole, your bag and the wind.
- [ ] **Competition mode**:
  - yardages only, no advice
  - on for any round that counts for handicap or competition
  - the Rules of Golf treat advice from a device as a breach
  - confirm details with England Golf
- [ ] Post-round debrief: "you dropped 9 shots on par 3s; your 150-yard club is short".
- [ ] Gym: weekly plan, sets and reps, and progression from the workout log.
- [ ] Dashboard coach card: this week's focus across your sports.
- [ ] Usage cap and cost logging per user.

**Phase 2: photos and nutrition, with safeguards**

- [ ] Form checks from photos (squat, deadlift, address position).
- [ ] General nutrition guidance, with guard rails:
  - general guidance only, never medical
  - flags for disordered eating
  - points to a GP or dietitian
  - 18+ only
- [ ] **Before launch**:
  - body images and health data are special category data under UK GDPR
  - explicit consent
  - a data protection impact assessment
  - photos analysed then deleted, not stored
  - one-tap delete-everything
  - clear wording on injury liability

**Phase 3: video**

- [ ] Swing and lifting video. An AI model reads still frames, not video, so real analysis needs body tracking first: joint angles, hip turn, bar path, measured on the phone (for example MediaPipe). Then the coach explains the numbers. A serious piece of work on its own.

### Football match analysis ("pro analysis for Sunday league")

The honest picture:

- Veo already sells its own analytics add-on, and Hudl, Trace and Pixellot do similar.
- Most Sunday league teams don't own a Veo.
- An AI model can't watch 90 minutes. About 2,700 frames is roughly £13 a match, still misses most passes, and can't read shirt numbers on a wide shot.
- Pro clubs use tracking software first (every player and the ball, every frame, mapped to a 2D pitch), then explain the numbers. That's a product in its own right.

Do it in this order, and stop at each step until people use it:

- [ ] **Step 1, tagged clips.**
  - Someone marks key moments watching the footage back, or uses Veo's own highlights.
  - They upload 10 to 30 second clips.
  - The coach analyses each clip together with what Roll Call knows: who played, goals and assists, crew ratings, and the formation and system the manager set.
  - Output: a match report, a note per player, three things to work on.
  - Needs direct-to-storage uploads (not through the app server).
- [ ] **Step 2, import Veo event data** if Veo lets clubs export it. Check a club's Veo account first.
- [ ] **Step 3, full tracking from raw footage.** Only once clubs are paying for step 1. Needs GPU processing and a player-tagging step.
- [ ] **Consent**: analyse your own players only, and each player opts in. The opposition hasn't agreed to be analysed.
- [ ] **Know who's paying.** This serves a club manager who'd pay, not a group of mates. Price it for clubs.

### More ideas from the audit, ranked

Kept to ideas that use what only Roll Call has: the crew, the season and the group chat.

1. **The AI season story in WhatsApp.** A weekly recap card posted into the group chat, written from the crew's real data: who turned up, who dropped late, Dan's third Man of the Match, the golf leader board moving. The share card is already the ad; this makes it the thing people wait for each Monday. It's cheap, it spreads, and it uses the coach's plumbing. **Build this first of all the P2 ideas.** It helps the core loop, not a side feature.
2. **One player across every sport** (already roadmap v2): one card, one reliability score, per-sport ratings. It makes the coach smarter and is the thing no single-sport app can copy.
3. **Reliability that's worth something.** A turn-up score venues can see (roadmap v2 venue partnerships), leading to off-peak slots and priority booking for reliable crews. That turns the no-show rule into a reward.
4. **Hands-free scoring on the course.** "Put me down for a five", spoken, then confirmed on screen. It comes from the coach's voice work at almost no extra cost.
5. **Crew vs crew, fairly.** Handicap-adjusted golf and padel challenges between crews, with results feeding both tables (roadmap v2), so mates' crews in different cities can play each other.
6. **Import instead of typing.** Apple Health, Strava and Hevy import for gym and running crews (roadmap "Later"), so the gym coach has data without anyone logging by hand.

---

## Parked

- Football redesign (paused until golf is done)
- Paid golf GPS provider (until affordable)
- Venue directory
- Booking deep links, second UK city (roadmap "Later")
