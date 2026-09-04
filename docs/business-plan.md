# Roll Call: Business Plan

Status: working draft, September 2026. Figures marked "assumption" are our own estimates and have not been validated with data.

## One line

Roll Call is the app for your crew, not your sport: the weekly group of 4 to 20 mates who play, train or watch together, organised in one place instead of a WhatsApp thread and a pile of bank transfers.

## Problem

Every regular crew has one organiser who books the pitch, court or tee time, chases the numbers, fronts the money and spends Sunday evening asking who still owes £7.50. Dropouts are the killer: someone bails at 8pm the night before, the game goes short, and the organiser eats the cost. Capo, a 2025 UK organiser app, calls dropouts "the single biggest headache" and we agree.

The tools that exist are built for someone else. Spond is built for youth teams and parents. Playtomic is built for padel venues and sits at 1.3 stars on Trustpilot, mostly over refunds and no-shows. Footy Addicts serves strangers dropping into pick-up games and gets hammered on fees. Golf apps sell subscriptions for score tracking that most casual golfers do not want. Nothing serves the adult casual crew that already exists and simply wants to keep turning up.

## Solution

Roll Call gives the organiser a session pin (venue, time, cost, capacity, deadline) and a share link. Members tap in from the link with zero install. The reserve list auto-promotes when someone drops. A late drop inside the crew's window (default 24 hours) still owes a share, which removes the organiser's biggest financial risk. After the session everyone rates each other in three taps, which feeds peer-rated player cards and a season-long crew league table. The ledger splits shares exactly and tracks who owes what.

The product is web-first (PWA), so the share link is the whole onboarding. Share cards are generated as images for WhatsApp previews. The card is the ad.

## Why now

- Padel has exploded: roughly 400k UK players at the end of 2024 to 860k in 2025 (LTA, verified in our research), with around 1,800 courts at 85 per cent peak occupancy. About half of UK players struggle to book peak slots, so a reliable crew that always fills its booking is worth something to venues.
- Adult football participation in England rose by 561k year on year, while 16 to 34 activity has fallen by roughly 0.5 million since 2015/16 (Sport England). The people who still play are doing it in fixed groups.
- 53 per cent of UK 18 to 34s now pick fitness over nightlife (Bloomberg, May 2026). Strava clubs reached 1 million, about four times growth in 2025. The social unit of exercise is the crew, not the club.
- Gen Z is 27 per cent of F1 fans and half of them are female (F1 2025 survey). Watching together is a crew activity too, and no one serves it well.
- Incumbents are exposed. Playtomic's 1.3 star rating, Padel Mates taking Padium and Rocket Padel from Playtomic in 2025, and Playskan launching a free availability aggregator in January 2026 all show the padel layer is contested and venues are willing to switch.

## Target customer

London first, 18 to 35.

**The organiser.** Call him Sam, 27, works in a hybrid office job, runs Tuesday 7-a-side at a Powerleague or a Thursday padel four at Rocket. He has run the WhatsApp group for two years. He fronts £70 to £120 a week and is owed money by at least two people at any moment. He wants the game to happen without chasing. He is the buyer even though he pays nothing.

**The member.** Call her Priya, 24, in the group because a colleague added her. She will not install an app for a Tuesday kickabout, but she will tap a link. She likes the banter, wants to know whether she is playing, and wants paying to be one tap. She is the growth engine because she is in three other crews.

## Market sizing (bottom-up, UK)

All group counts below are assumptions derived from participation data, not measured figures.

| Segment | Basis | Estimated regular adult crews (assumption) | Sessions per crew per month (assumption) |
|---|---|---|---|
| Casual 5/7-a-side football | Sport England adult football participation; assume 15 to 25 per cent of adult players are in a fixed weekly group of 10 to 14 | 60,000 to 120,000 | 3 to 4 |
| Padel groups | 860k players (LTA); assume 20 to 30 per cent play in a regular four or eight | 40,000 to 65,000 | 3 to 6 |
| Golf societies and regular fourballs | 12.6M adults play some golf; assume 3 to 5 per cent play in an organised society or standing fourball | 25,000 to 50,000 | 1 to 2 |
| Gym crews and race-watching crews | Included as expansion, not sized for revenue in this plan | not sized | not sized |

Taking the middle of the football, padel and golf ranges gives roughly 180,000 UK crews (assumption). At £6 to £12 per person per session (assumption) and 8 to 12 people, a football crew moves £60 to £140 per session through someone's bank account. Across the addressable crews that is in the order of £1 billion a year of session money (assumption, order of magnitude only). Spond alone moves around €270 million a year in payments, which supports the shape of the estimate.

## Business model

No subscriptions. Golf apps show the ceiling: 18Birdies at about $100 a year, Arccos at $199, and GameBook forced to halve its price to $40. Hevy caps tracking at $24 a year with 15 million users. Casual 18 to 35s will not pay a monthly fee to organise a kickabout, and a paywall on the organiser kills the only person who brings a crew. Revenue must come from money that already moves.

1. **Payments margin.** Once Stripe Connect is live, a fee on collected session money in the range of 2 to 3 per cent plus 20p per transaction, disclosed up front and shown on the share card. This is the Spond model applied to adults. v1 runs manual settle with no fee and no revenue, deliberately, to prove the loop first.
2. **Venue partnerships.** A crew with a 90 per cent turn-up rate that books the same slot every week is the best customer a venue has. We sell that reliability: standing slot placement, off-peak fills, and a referral fee or discount share when a Roll Call crew books.
3. **Premium crew features (later).** Season awards night generator, custom card designs, extended history. Priced per crew per season as a one-off, never as a rolling subscription.

## Unit economics per crew per month (assumptions)

| Line | Football crew | Padel four |
|---|---|---|
| Sessions per month | 4 | 4 |
| Money collected per session | £90 | £48 |
| Monthly volume | £360 | £192 |
| Roll Call take at 2.5% + 20p per payer | £9 + £8 = £17 | £4.80 + £3.20 = £8 |
| Stripe cost (approx 1.5% + 20p) | £5.40 + £6.40 = £11.80 | £2.90 + £2.60 = £5.50 |
| Net payments margin | about £5 | about £2.50 |
| Hosting and messaging cost | under £0.50 | under £0.50 |

The payments line alone is thin, which is why the fee structure must be set carefully and why venue revenue matters. At 1,000 active crews the payments net is in the region of £4,000 a month (assumption), enough to fund infrastructure, not salaries. The plan is to prove retention and volume first, then layer venue revenue where the margin is real.

## Competitive landscape and moat

| Competitor | Built for | Gap Roll Call fills |
|---|---|---|
| Spond (4M MAU, 1.5M UK) | Youth clubs, parents, coaches | Adult casual brand; no parent-child model; peer ratings and banter |
| Playtomic (about 80 per cent of UK padel venues, €65M raised Feb 2025) | Venues, booking, finding strangers | Padel only; the crew, not the court, is the unit; no dropout accountability |
| Footy Addicts | Drop-in strangers | Your own group, no per-head fee disputes |
| Capo | Football organisers | Cross-sport; the fun layer that keeps members coming back |
| Quick9, ParUp, RiddyGolf, Fourball | Golf societies | None established; we cover golf as one mode of a crew app |
| WhatsApp plus bank transfer | Everyone | The real competitor; see risks |

The moat is not the booking, which venues control. It is three things.

- **The crew brings its own liquidity.** We never have to find players. One organiser brings 8 to 20 people in a single share, and each member is in other crews.
- **Cross-sport identity.** A player card that carries your football form, padel rating and Sick Notes count across every crew you are in is something no single-sport app can build.
- **Adult casual brand.** Spond is a parent's app. Playtomic is a venue's app. Roll Call is your mates' app, and brand in this segment is sticky because it lives in the group chat.

## Team and hiring, first 12 months

Keep it small.

- Months 0 to 6: two founders (product and engineering; strategy, growth and venue partnerships). Contract designer for share cards and player cards, roughly two days a week.
- Months 6 to 12: one full-stack engineer, one community and growth lead based in London who runs the first 100 crews personally. Part-time finance and compliance support on contract when Stripe Connect goes live.

No sales team. Organisers are found by the growth lead and by share cards.

## Funding ask and use of funds

Pre-seed of £400,000 to £600,000 for 18 months of runway.

| Use | Share |
|---|---|
| Salaries (four people by month 12) | 60 to 65 per cent |
| Design and share card production | 8 to 10 per cent |
| Legal, compliance, ICO, Stripe onboarding, accessibility audit | 6 to 8 per cent |
| London community programme (venue events, awards nights, pilots) | 10 to 12 per cent |
| Infrastructure and tooling | 5 per cent |
| Contingency | 5 per cent |

Milestones for the round: 15 pilot crews with 11 or more retained at week 12; 300 active crews in London by month 12; Stripe Connect live with fee disclosure; one venue partnership agreement signed.

## Key risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| WhatsApp gravity | The chat already works and nobody wants a second place to look | We do not replace the chat. Every action produces a card that goes back into WhatsApp. Zero install for members. |
| Spond or Playtomic copies us | Both have distribution and money | Their brands are anchored (parents, venues). We move faster on the fun layer and cross-sport identity, and we never depend on venue booking for the loop. |
| Peer-rating fatigue | Ratings become a chore or turn nasty | Three taps, sport-specific wording, banter categories opt-out per crew, organiser can hide. Track completion rate as a guardrail metric and cut categories that fall below it. |
| Compliance | Holding money or running paid predictions is regulated | Predictor is free with no prizes. Side pots are recorded, never held. Stripe Connect pass-through. ICO registered before pilot. See legal-and-compliance.md. |
| Organiser burden | If the organiser has more to do than in WhatsApp, we lose | Pin a session in under 60 seconds, reserve list auto-promotes, reminders automated in v1.1. Organiser effort is a tracked activation metric. |
| Thin payments margin | Fee revenue alone does not fund a team | Venue partnerships and one-off premium features; do not raise fees to compensate, that is how Playtomic and Footy Addicts lost trust. |
