# Metrics

Status: working draft, September 2026. Targets marked "assumption" are pilot targets we will revise with data.

## North star

**Sessions played per crew per month.**

Formula: sessions with attendance confirmed by the organiser, divided by crews that pinned at least one session in the month.

Target: 3.0 for football and padel crews, 1.5 for golf (assumption). If this number holds, everything else follows: money moves, cards get shared, venues care.

## Activation

| Metric | Formula | Target |
|---|---|---|
| Organiser time to first pin | Seconds from crew creation to first session pinned, median | Under 60 seconds |
| Invite response within 48 hours | Members who tap in or decline within 48 hours of a pin, divided by members invited | 60 per cent or more |
| First session completed | Crews with at least one attendance-confirmed session within 14 days of creation, divided by crews created | 70 per cent (assumption) |

## Retention

| Metric | Formula | Target |
|---|---|---|
| Crew active at week 4 | Crews that pinned a session in week 4 without a prompt from us, divided by crews created in week 0 | 85 per cent (assumption) |
| Crew active at week 8 | Same, week 8 | 80 per cent (assumption) |
| Crew active at week 12 | Same, week 12 | 73 per cent, meaning 11 of 15 pilot crews |
| Member return | Members who tapped in to two or more sessions in the last 30 days, divided by members invited to two or more | 70 per cent (assumption) |

"Without a prompt" means no message from the Roll Call team in the preceding seven days. Automated reminders sent by the product do count as unprompted.

## Reliability

| Metric | Formula | Target |
|---|---|---|
| Turn-up rate | Members confirmed as attended, divided by members tapped in at deadline | 85 per cent or more (assumption) |
| Late-drop rate | Drops inside the crew's window, divided by members tapped in at deadline | Under 8 per cent (assumption) |
| No-show rate | Tapped in and not attended without dropping, divided by members tapped in at deadline | Under 5 per cent (assumption) |
| Reserve fill rate | Sessions where a reserve was promoted and attended, divided by sessions with a drop | 60 per cent or more (assumption) |

Reliability is the number we take to venues. It is reported per crew as a rolling 10-session figure and shown to the crew on its table.

## Money

| Metric | Formula | Target |
|---|---|---|
| Settled within 7 days | Sessions where every share is marked paid within 7 days of the session, divided by sessions with a cost | 80 per cent or more (assumption) |
| Outstanding per organiser | Sum of unpaid shares older than 7 days per organiser, median | Under £15 (assumption) |
| Fee take (from v1.1) | Application fees collected, divided by money collected through Stripe | 2 to 3 per cent plus 20p per transaction, as disclosed |

## Fun

| Metric | Formula | Target |
|---|---|---|
| Rating completion | Members who submitted all three votes within 24 hours of the session, divided by members confirmed as attended | 50 per cent or more (assumption) |
| Share card sends | Cards opened via the share action, divided by sessions | 1.5 per session (assumption) |
| Card-attributed crews | New crews whose first organiser arrived via a share card link, divided by new crews | 30 per cent or more (assumption) |

## Guardrails

These can go up while the north star goes up, and if they do we stop and fix the cause.

| Metric | Formula | Limit |
|---|---|---|
| Rating opt-outs | Crews that have turned off one or more banter categories, divided by active crews | Watch; above 40 per cent means the default categories are wrong |
| Reports | Reports submitted per 100 active members per month | Under 1 |
| Repeated targeting alerts | Crews where one member received a majority of "worst miss" votes for four consecutive sessions | Every case reviewed by a human within 48 hours |
| Erasure requests | Account deletions citing ratings or privacy, per 1,000 members | Under 2 |
| Money disputes escalated to us | Disputes about shares or refunds that reach the Roll Call team | Zero unresolved at pilot end |

## Reporting

Weekly during the pilot, one page, all metrics above by crew and in aggregate. Monthly after that. Metrics are computed from product data, not surveys, except the organiser interview at weeks 4 and 12.
