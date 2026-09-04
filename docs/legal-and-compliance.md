# Legal and Compliance

Status: working draft, September 2026.

**This document is not legal advice.** It records our current understanding of the UK rules that touch Roll Call and the product decisions we have taken to stay on the right side of them. Every section ends with what we need a solicitor to confirm. Nothing here should be relied on until that review is done.

## Gambling Act 2005: predictor and side pots

Under the Gambling Act 2005, fantasy and prediction games with paid entry and prizes are generally treated as pool betting and require a Gambling Commission licence. Free-to-enter games, and genuine skill competitions, fall outside the licensing regime.

**Race-weekend podium predictor.** Free to enter, no prizes of any kind, no entry fee, no in-app currency that could be bought. Bragging rights and league table points only. This keeps it outside the Act. We will not add sponsored prizes, even non-cash ones, without a fresh legal review, because a prize plus a paid entry route (including "premium" access) is what crosses the line.

**Side pots for golf and americano.** Mates playing golf commonly have a small private bet on the round. Roll Call records the result of the game (the Stableford card, the americano standings) and can show a crew-defined "pot" note as a memo. Roll Call never holds the stakes, never collects them, never pays out and never takes a rake. The money, if any, moves between friends outside the app exactly as it does today. Private betting between individuals who know each other, on their own game, with no operator taking a cut, is not what the Act regulates as an operator activity.

**What would cross the line.** Any of the following would engage the Act and we will not do them without a licence: collecting stakes through the ledger, holding a pot in a Roll Call account, charging any fee linked to a pot, offering prizes on the predictor, allowing pots between people who are not in a private crew, or promoting pots as a feature.

Solicitor to confirm: that the memo-only pot feature is not facilitating gambling; whether the predictor needs any wording to avoid being read as a promotion; the interaction with the crew league table points.

## Payments: PSRs 2017 and e-money

Holding customer money on behalf of others can make a business a payment institution under the Payment Services Regulations 2017, or an e-money issuer, both of which require FCA authorisation. We are not going to become either.

**v1: manual settle.** The ledger records what each person owes and lets the organiser mark shares as paid. Money moves directly between members and the organiser by bank transfer, as it does today. Roll Call touches no funds. The ledger is a record, like a shared spreadsheet, not a payment service.

**v1.1: Stripe Connect pass-through.** Members pay through Stripe. Funds go to the organiser's connected account (or the venue's, later). Roll Call takes its fee as an application fee on the transaction. Stripe is the licensed provider; Roll Call never holds member funds. Payment timing, refunds and chargebacks follow Stripe's rules, and we will document them in the terms.

**What we will not do.** No wallet, no stored balance, no "Roll Call credit", no pooling funds before paying a venue, no lending the organiser the venue fee.

Solicitor to confirm: that the application-fee structure and organiser-as-merchant model keep us outside PSRs authorisation; whether we need to register as an agent of Stripe in any form; consumer-facing refund wording.

## UK GDPR

Roll Call processes personal data and must register with the ICO before the pilot starts. Our data protection officer role is held by a founder until headcount justifies more.

- **Lawful basis.** Performance of a contract for account and session data. Legitimate interests for share card generation and product analytics, with a balancing test recorded. Consent for marketing messages and for reposting content on social channels.
- **Data minimisation.** A member needs a display name and a phone number or email for reminders. We do not ask for date of birth beyond an 18+ confirmation, address, or payment card details (Stripe handles those).
- **Peer ratings are personal data about other people.** A vote for "worst miss" is data about the person voted for. Ratings are visible only within the crew, aggregated on the card, and individual votes are never shown. Members can see their own aggregated ratings and request the underlying data. Banter categories are opt-out per crew and the organiser can hide any category.
- **Retention.** Session and ledger data retained for the life of the crew plus 12 months. Individual votes retained for one season then aggregated. Accounts deleted after 24 months of inactivity with notice.
- **Right to erasure.** A member can delete their account. Their name is removed from cards and tables and replaced with "former member". Ledger entries are retained where needed for the organiser's records, minimised to amount and date.
- **Under-18s excluded.** Roll Call is 18 plus. We ask for an age confirmation at sign-up and remove accounts reported as under-age. We do not build a parent-child model.
- **International transfers.** Hosting in the UK or EU. Any US processors (for example Stripe) under standard contractual clauses or the UK addendum.

Solicitor to confirm: the legitimate interests assessment for ratings; whether the ratings feature needs a data protection impact assessment (we believe yes and will do one); retention periods.

## Consumer law

The Consumer Rights Act 2015 and the Consumer Protection from Unfair Trading Regulations apply to the service and to any fee. The lesson from Footy Addicts and Playtomic reviews is that hidden or late fee disclosure, and unclear refund rules, destroy trust faster than anything else.

- The Roll Call fee, when introduced, is shown on the session pin, on the share card and at the point of payment, in pounds, before anyone pays.
- The late-drop rule and window are shown on every pin and are the crew's rule, set by the organiser, not ours.
- Refunds for cancelled sessions follow a published policy: if the organiser cancels, all shares are refunded in full including our fee.
- Terms are written in plain English, and there is no auto-renewing subscription, so no cancellation trap.

Solicitor to confirm: fee disclosure wording; whether the late-drop charge needs particular treatment as a term between members rather than between Roll Call and the member.

## Community rules for ratings

Ratings are for fun and must stay that way.

- Positive categories (player of the match, ran the hardest) are on by default. Banter categories (worst miss, Sick Notes) are opt-out per crew and any organiser can hide them at any time.
- No free-text ratings. All categories are fixed and sport-specific so nothing personal can be written.
- Any member can report a crew or a member. Reports go to a human within 48 hours during the pilot.
- Repeated targeting of one member (for example a majority of "worst miss" votes for the same person for four consecutive sessions) triggers a prompt to the organiser to review and hide the category.
- We reserve the right to remove crews that use the platform to harass anyone.

## Accessibility

Target WCAG 2.2 AA for the web app and share cards. Cards carry alt text. Colour is never the only signal in league tables or the ledger. Full keyboard and screen reader coverage of the tap-in and rating flows before public launch. Audit by a third party before v1.1.

## Terms outline

1. Who we are and what Roll Call does (a record and coordination tool, not a payment service or booking platform)
2. Eligibility (18 plus, UK)
3. Crews, organisers and members: roles and responsibilities; the organiser sets the crew's rules
4. Late-drop shares and no-shows: rules set by the crew, recorded by Roll Call
5. Money: v1 manual settle; v1.1 Stripe Connect; fees; refunds
6. Ratings and cards: how they work, opt-outs, reporting
7. Side games: free to play, no prizes, pots are memos only
8. Acceptable use and community rules
9. Privacy notice (separate document, linked)
10. Liability, termination and governing law (England and Wales)

## Solicitor checklist

- Gambling Act position on predictor and pots
- PSRs 2017 position on Stripe Connect structure
- Ratings feature: lawful basis, DPIA, retention
- Fee disclosure and refund wording under consumer law
- Terms and privacy notice review
- Late-drop charge as a member-to-member term
- ICO registration tier and DPO requirement
