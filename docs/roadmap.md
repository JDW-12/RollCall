# Roadmap

Status: working draft, September 2026. Dates are targets, not commitments.

## v1: built now (pilot)

The core loop, web-first as a PWA, zero install for members.

- Crew creation with organiser role and share link
- Session pin: venue, time, cost, capacity, deadline
- Tap in from share link, no install
- Reserve list with auto-promotion on drops
- Late-drop window per crew (default 24 hours), late drops still owe their share
- Organiser confirms attendance
- Three-tap peer ratings with sport-specific wording (player of the match, ran the hardest, worst miss)
- Peer-rated player cards
- Season crew league table: +3 turned up, +2 per MOTM vote, +1 per grafter vote, -2 late drop, -3 no-show; form, streaks, Sick Notes count
- Ledger per crew: exact share split, mark as paid, who owes what; manual settle
- Side games: football team balancer, padel americano generator, golf Stableford card, race-weekend podium predictor (free, no prizes)
- Share cards generated as images for WhatsApp previews
- Ratings opt-out per crew and organiser hide
- Reporting flow

## v1.1: shipped ahead of the pilot

Reminders, Stripe Connect card payments, season awards, public previews of shared links, referral tracking and the founder dashboard are built. Also shipped: account merge for guests and calendar export, a venue address finder on the session form (Google Places or OpenStreetMap), and golf course cards: a shared library of par and stroke index per course and tee, seeded from a course-data API, a scanned photo of the paper card, or typed in, and corrected by whoever plays there next. Also shipped: the club hub for football and padel crews, covering leagues and cups, fixtures against an opponent, results with per-player goals, assists and manager ratings, a pasted league table, and season player stats. Remaining from the original v1.1 list: a venue directory.

## v1.1 original scope (target months 4 to 6)

Reduce organiser effort and make money move cleanly.

- Email and WhatsApp reminders before the deadline and before the session
- Stripe Connect pass-through with fee shown on pin, card and checkout
- Calendar export (ICS) for sessions
- Venue directory: named venues with address and map link, seeded from pilot crews
- Accessibility audit and fixes to WCAG 2.2 AA
- Season end summary card

## v2: London density (target months 7 to 12)

Turn reliable crews into a venue proposition and deepen the fun layer.

- Venue partnerships: reliability score visible to partner venues, off-peak offers to crews
- Standing bookings: a crew's recurring slot represented as a series of pins
- Crew-vs-crew challenges: two crews agree a fixture, results feed both tables
- Seasons and awards night generator: end of season awards pack, shareable
- Multi-crew player identity: one player card across every crew you are in, with per-sport ratings
- Organiser handover and co-organiser roles

## Later (beyond month 12)

Only after 300 active London crews.

- Booking deep-links to Playtomic and Playfinder from a session pin
- Strava and Hevy import for gym crew streaks
- Karting and sim racing results as a side game
- Second UK city
- One-off premium crew features (custom card designs, extended history), priced per season

## Non-goals

These are deliberate and will not be built without a change to this document.

- **No native app store apps in v1 or v1.1.** The share link is the onboarding. A PWA is enough until members ask otherwise.
- **No player-finder for strangers.** Crews bring their own people.
- **No booking engine.** Venues own booking. We link out.
- **No subscriptions.** Revenue comes from payments margin, venue partnerships and one-off premium features.
- **No wallet or stored balance.** Money passes through Stripe or moves outside the app.
- **No prizes on the predictor and no held stakes on side pots.**
- **No free-text ratings.** Fixed categories only.
- **No under-18 or parent-child model.** Spond has that market.
- **No league management for formal clubs.** Fixture lists, referees and league admin are out of scope.
- **No chat.** WhatsApp is the chat. Roll Call sends cards into it.
