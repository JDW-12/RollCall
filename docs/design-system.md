# Design system, v2 ("floodlit")

Roll Call looks like a five-a-side pitch under floodlights: dark ground, one green, big condensed numbers. The references are EA FC Ultimate Team cards, Strava's dark mode and Sky Sports match graphics. It is not a SaaS dashboard. If a screen could be a CRM with the copy changed, it is wrong.

## The principle: not a SaaS dashboard
- Big numbers carry the page. Text is small and mono-labelled. A screen should have one number you can read from across the room.
- One accent. Pitch green means "in", "good", "do this". Amber and red exist only for warn and bad states. Per-player hue appears only on avatars and cards.
- Surfaces are dark panels with a hairline, not white cards with drop shadows. Hierarchy comes from scale and the accent, not from boxes inside boxes.
- Nothing is grey for the sake of it. Neutrals carry a green bias so they read as chosen.
- Copy is second person, short, British. "Can't make it", "Sick note", "Bibs". Nothing is called a webhook.

## Tokens
Dark is the default (`data-theme="dark"` on `<html>`). Light is an explicit choice via `data-theme="light"`. Components use only the Tailwind colour classes below; never hardcode hex except inside `style` props for a per-player hue (`oklch(L C hue)`).

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| ground | #0b1210 | #f5f6f2 | page |
| ground-2 | #111a16 | #ebeee6 | table headers, quiet fills |
| panel | #151f1a | #ffffff | surfaces |
| panel-2 | #1b2821 | #f2f4ef | inputs, secondary buttons |
| ink / ink-2 / ink-3 | #f2f5ef / #b7c3bb / #7e8b83 | #14201b / #3e4a44 / #6e7a73 | text hierarchy |
| line / line-2 | #243129 / #1c2722 | #d5dad2 / #e6e9e2 | borders, dividers |
| pitch | #35d07a | #1e8a4c | the accent: primary actions, "in", good |
| pitch-ink | #06130b | #ffffff | text on pitch |
| pitch-soft | rgba(53,208,122,.14) | #ddefe3 | tinted fills behind pitch text |
| pitch-deep | #22b366 | #146238 | hover on pitch |
| pitch-glow (CSS var only) | rgba(53,208,122,.35) | rgba(30,138,76,.18) | floodlight radials, button shadow |
| card / card-soft / card-ink | #ffc53d / rgba(255,197,61,.14) / #ffd36a | #e5a800 / #fbf0c9 / #5c4300 | warn, reserves, "owes" |
| red / red-soft | #ff5c4d / rgba(255,92,77,.14) | #c8412b / #f8ddd6 | late drops, no-shows, danger |

The body carries a page-wide floodlight: a radial `pitch-glow` centred above the fold. Hero sections may add a second, tighter glow behind their focal object. The share-card images (`src/lib/og.ts`) use the same dark values as literal hex because satori cannot read CSS variables; keep the two in step.

## Type
- Display: **Barlow Condensed** 600 to 800, uppercase, `leading-none`. Headings, big numbers, crew names, cards. Tailwind `font-display`, or `.display` for a span.
- Body: **Instrument Sans** 400 to 700. Tailwind `font-sans`.
- Utility: **IBM Plex Mono** 400/500 for eyebrows, table headers, pills, stat labels. `.eyebrow` is 11px, 0.14em tracking, uppercase, ink-3.
- Tabular numerals (`.tnum`) wherever digits line up.

## Tiers
Player cards take a tier from the overall rating (`tierOf` in `player-card.tsx`, `ogTier` in `og.ts`):

| Tier | Overall | Ground |
|---|---|---|
| Elite | 85+ | the player's hue blending into hue + 40, plus the `.foil-elite` holographic overlay |
| Gold | 72 to 84 | gold gradient |
| Silver | 60 to 71 | silver gradient |
| Sick note | under 60 | bronze gradient |

Every card carries the overall number, the tier label, the sport icon, crew name and rank, an avatar circle in the player's dark hue, and six stats: TRN, FRM, the sport's two point-scoring categories, STK, PTS.

## Foil
`.foil` gives a card a moving sheen, driven by the `--sheen` custom property that `Tilt` sets from the pointer. `.foil-elite` adds a conic holographic overlay for Elite cards. Both are pure CSS; `Tilt` is the only client component involved and it does nothing on touch or under reduced motion.

## Motion classes
| Class | What |
|---|---|
| `.anim-rise`, `.anim-rise-2`, `.anim-rise-3` | entrance: 8px rise and fade, staggered by 60ms. First few blocks of a page only. |
| `.anim-pop` | scale pop for a state change (a tap-in landing, a vote counted) |
| `.anim-pulse` | pitch-glow ring pulse for a live element (a countdown, a spot just opened) |
| `.anim-flame` | streak flame wobble |
| `.press` | 0.97 scale on `:active`; every button and tappable row |

Rules: entrance on the first few blocks, `.press` on buttons, nothing else decorative. `prefers-reduced-motion` turns every animation and transition off in CSS.

## Surfaces and patterns
- `.surface`: panel with a subtle top-light gradient and a `line` hairline, 12px radius.
- `.surface-raised`: adds the theme shadow. Use for the one object a page is about, not for lists.
- `.pitch-lines`: 28px grid in 8% ink, masked to fade downwards. Crew headers, CTA bands.
- Radii: `rounded-sm` 6px (pills, inputs), `rounded-md` 12px (buttons, panels), `rounded-lg` 18px (cards, bands).

## Icons
`src/components/icons.tsx`, 24px grid, 1.75 stroke, round caps, `currentColor`. Pass `size`.

- Navigation: IconHome, IconCalendar, IconTrophy, IconCoins, IconPeople
- Sports: IconFootball, IconPadel, IconGolf, IconGym, IconFlag, and `SportIcon({ sport })` to pick by key
- Status and actions: IconCheck, IconX, IconClock, IconFlame, IconBolt, IconShare, IconChevron, IconPlus, IconAlert, IconWhistle, IconPin, IconMedal, IconArrowUp, IconArrowDown

Icons sit in a 40 to 44px rounded square: `bg-pitch-soft text-pitch` for a feature, `bg-pitch text-pitch-ink` for a step in a sequence.

## Components
- `ui.tsx`: `Button` and `LinkButton` (primary / secondary / ghost / danger), `Panel`, `Pill` (neutral / good / warn / bad / ink), `Eyebrow`, `PageTitle`, `Field`, `Stat`, `Notice`, `EmptyState`, `Divider`, `cls`
- `avatar.tsx`: `Avatar`, generated from the per-user hue
- `player-card.tsx`: `PlayerCard`, the collectible, with `tierOf`
- `tilt.tsx`: `Tilt`, pointer-tracked 3D tilt and sheen
- `ring.tsx`: `Ring`, progress ring for spots filled
- `countdown.tsx`: `Countdown`, live to kick-off
- `sparkline.tsx`: `FormDots`, last five sessions
- `animated-number.tsx`: `AnimatedNumber`
- `shell.tsx`: `CrewShell`, `CrewBand`, `PlainShell`
- `session-card.tsx`, `feed.tsx`, `share.tsx` (`ShareButtons`), `action-form.tsx` (`ActionForm`, `SubmitButton`), `logo.tsx` (`LogoMark`, `Wordmark`), `hero-cards.tsx` (`HeroCards`, `ChatPreview`), `games/*`

## Layout
- Mobile first at 420px. Content width 768px; 1152px for the landing and wide crew pages.
- 44px minimum tap targets. Inputs are 44px tall. Bottom tab bar under 640px, so pages leave room (the shell handles it).
- Every list row is one object: avatar, name, one status chip, one number. Never two full-width buttons in a row.
- Sibling spacing with flex/grid gap, never stacked margins.
- Horizontal strips scroll with `snap-x` and `.scrollbar-none` on mobile and become a grid at `lg`.

## Empty states
Designed, not apologetic: an icon, a bold display line, one action. `EmptyState` does this.

## Share cards
`opengraph-image.tsx` routes draw with satori: flex only, explicit `display: flex` on any div with more than one child, hex colours from `OG` in `src/lib/og.ts`, hsl for per-player hues, fonts from `ogFonts()`. The session card is a poster: big title, floodlight behind the number tile (pitch when open, panel with a pitch border once played). The player card recreates the in-app card on the left and the six stats big on the right.

## Access
Focus rings 2px pitch. Colour is never the only signal (pills carry text, form dots carry an aria-label). Target WCAG 2.2 AA on the dark theme first; the light theme uses deeper values of the same tokens.
