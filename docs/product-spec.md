# Roll Call product spec (v1)

## Who it's for

**The organiser.** One person per crew who books the pitch or court, chases the group, and fronts the money. Age 18 to 35, London first. Their pain is chasing: who's in, who's dropped, who owes. If the first session takes more than a minute to set up, they go back to WhatsApp.

**The member.** Everyone else. They will not install an app to say "in". They will open a link, tap a button and go back to the chat. They will, however, open the app on a Wednesday to see the table if there's something to argue about.

## Objects

| Object | What it is |
|---|---|
| Crew | The group. One main sport, a city, a late-drop window, a season name, an invite link. |
| Member | A person in a crew, either organiser or member. People can be in many crews. |
| Session | One occasion: sport, title, venue, start, length, spots, cost, cost mode, commit-by deadline, notes. Status open, played, cancelled. |
| RSVP | A person's answer to a session: in, reserve, out. Carries queue position, drop time, and whether the drop was late. |
| Attendance | Organiser-confirmed: did the person actually play. |
| Rating | One vote per rater per category per session. |
| Ledger entry | A charge (person owes crew) or a payment (person paid, or was waived). |
| Game | A side game attached to a session: teams, americano, stableford, predictor. |

## Rules

### RSVP and reserves
- Tapping in takes a spot if one is free, otherwise joins the reserve queue in order.
- Dropping a held spot promotes the earliest reserve automatically.
- Leaving the reserve list is never a late drop.
- Coming back after an "out" starts a fresh queue position.
- Raising capacity promotes reserves. Lowering it never demotes anyone.
- Nobody can tap in after kick-off. Organisers can answer on someone's behalf.

### Late drops
A drop is late when it happens inside the crew's window before kick-off (default 24 hours), or after the session's commit-by deadline if one was set. Late drops still owe their share and take −2 on the table.

### Attendance and no-shows
The organiser ticks who played. Anyone who held a spot and is unticked is a no-show: still owes, −3 on the table. The organiser can add walk-ons (people who weren't in but played) and can fix attendance later. Confirming again rebuilds that session's charges and keeps payments.

### Money
- Pence only. "Split it" divides the booking exactly between everyone who owes, with the remainder pennies going to the first payers so the total is always right. "Per head" charges everyone the same.
- Who owes: everyone who played, no-shows, late drops.
- The organiser marks payments (transfer, cash, card, waived). Balances are charges minus payments. Anyone can see who owes what. Only organisers can record or undo payments.
- v1 does not move money. See legal-and-compliance.md.

### Ratings
Three questions, one name each, only for people who played. You can't vote for yourself in scoring categories. Re-submitting replaces your votes. Votes are private; only totals show. The third category is banter only and carries no points.

### Table
Per played session: +3 turned up, +2 per top-category vote, +1 per second-category vote, −2 late drop, −3 no-show. Form is a 4.0 to 10.0 score per session (6.0 baseline, pushed up by vote share, nudged down by banter votes), averaged over the last five sessions played. Streak counts consecutive sessions turned up; early "out" neither breaks nor extends it. Sick notes = late drops + no-shows.

### Player card
0 to 99 stats FIFA-style: turns up (attendance rate), form, votes, graft, streak, plus an overall. The card is rendered on the player page and as a 1200×630 image for link previews.

### Share cards
Every session and every player page has an Open Graph image. Sharing the link into WhatsApp shows the card. Session cards show spots left and who's in before, and turned-up count plus player of the match after.

### Side games
- **Teams (football):** balanced on form with a seeded snake draft and a swap pass. Re-pick gives a different fair split.
- **Americano (padel):** rotating partnerships, sit-outs shared when not a multiple of four, scores per match, standings by points then difference.
- **The club hub (football and padel).** A crew can link the league or cup it plays in: a link out, the team name as the league spells it, and the league's own table. Fixtures are sessions with an opponent, a home-or-away and a cup round, so RSVPs, money and the share card all work as they already do. After the whistle the manager enters the score and each player's goals, assists and mark out of ten. The League tab gathers the record and form, the next fixtures, the table with the crew's row picked out, every result, and the season's player stats. The table belongs to the division rather than to a crew, which is what keeps it from being work. If another crew already plays in that division, Roll Call recognises it from the opponents the crew has faced — three is enough, and they are opponents the manager was entering anyway — and offers the table for one tap. Only the first crew in a division sources anything, and for them it is a whole-page paste: select all, copy, paste, and the parser finds the table among the navigation and the sponsor lines. A stale table nudges its organiser.

A live feed sits on top for crews that can reach their league admin. There is no open API for FA Full-Time or Powerleague, and the FA has closed its public snippet pages precisely to stop products scraping league data, so Roll Call goes through the front door: the official feed snippet an admin generates for their own club, pasted in once, refreshing nightly, on view and on demand. Nothing is scraped, only the two league platforms are ever fetched, and a feed that stops answering leaves the last good table in place with a note against it.
- **What you vote on is the crew's call.** Every sport ships with three categories; organisers can rename them or add up to two more from Crew settings. The first two carry table points (+2, +1), the rest are banter. Keys are positional, so renaming keeps the votes already cast.
- **Stableford (golf):** UK society scoring from playing handicap and stroke index. Each player enters their own gross hole by hole on a phone-first scorer (stepper per hole, first tap lands on par, shots received shown, points and front/back totals live); organisers can edit anyone's and the course. Once cards are in, the session's share card becomes the leaderboard. The course card comes from a shared library (par and stroke index per course and tee), a course-data API when configured, a scanned photo of the paper card, or the two rows typed in. Corrections update the library so the next crew gets the right card. On a golf session the venue finder searches the course database, and picking a course there loads its card (pars, stroke indexes, yards) straight onto the session. Each card also tracks the round's highlights: hole results (ace, albatross, eagle, birdie…), shot of the day, longest drive and balls lost, entered alongside the scores. Season golf stats and a golf-flavoured player card (handicap, average points, best round, birdies, wins) build from every saved card.
- **Podium predictor (race weekends):** P1 to P3 plus first retirement. Locks at session start. Free to play, no prizes. Exact spot 10, on podium 4, first out 5.

## Growth loop
- **Public previews.** A session or player link opened by someone outside the crew shows a read-only poster with "Join <crew> to tap in" (the invite) and "Start your own crew". Session ids are unguessable, so the link itself is the access control.
- **Referrals.** "Start your own crew" from a preview goes through `/go?ref=<crewId>`, which remembers the referring crew for 30 days. A crew created afterwards records `referredByCrewId`.
- **Season awards.** `/crew/<slug>/season`: champion, player of the season, iron man, streak king, grafter, sick note of the season, banter award. Public, with its own share card.
- **Events.** Share clicks (with what and via), preview views and referral landings are recorded for the pilot dashboard. Nothing is sent to a third party.

## Calendar
Every session has an "Add to calendar" download for members. Crew settings has a subscribable feed (`/cal/<token>.ics`) that carries titles, times and venues only, never names or money; the token rotates with the invite link.

## Founder dashboard
`/founder`, gated by `FOUNDER_EMAILS`. Crews and activation, turn-up and late-drop rates, settlement within seven days, rating completion, week 4/8/12 retention, sessions per week, the growth loop counters, and a per-crew table with last-pinned staleness.

## Identity
- Joining from an invite link creates an account from just a name and sets a long-lived cookie.
- Adding an email later (six-digit code) lets that person sign in on another phone. If the email already belongs to an account, the guest account is folded into it: memberships, RSVPs, attendance, votes given and received, money and side-game entries all move across, the existing account wins any conflict, and the guest row is deleted.
- Under-18s are out of scope and the landing page says so.

## Screens
Landing · Start a crew · Sign in / verify · Your crews · Join (invite) · You (profile) · Crew home · Sessions · Pin a session · Session (open) · Session (played) · Who turned up · Rate · Table · Player · Money · Crew settings.

## Non-goals for v1
Chat, push notifications, card payments, venue booking, player-finding, multi-crew player identity across crews, admin tooling.
