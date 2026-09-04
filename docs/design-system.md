# Design system

Roll Call looks like a scoreboard on a phone, not a fitness app. Condensed capitals for anything that scores, a calm humanist sans for reading, a mono for labels and numbers.

## Type
- Display: **Barlow Condensed** 600 to 800, uppercase. Headings, big numbers, crew names, player cards.
- Body: **Instrument Sans** 400 to 700.
- Utility: **IBM Plex Mono** 400/500 for eyebrows, table headers, pills. 11px, 0.12em tracking, uppercase.
- Tabular numerals (`.tnum`) wherever digits line up.

## Colour tokens
| Token | Light | Dark | Use |
|---|---|---|---|
| ground | #F5F6F2 | #0F1512 | page |
| ground-2 | #EBEEE6 | #161E1A | table headers, quiet fills |
| panel | #FFFFFF | #141C18 | cards |
| ink / ink-2 / ink-3 | #14201B / #3E4A44 / #6E7A73 | #EEF2EC / #BAC5BD / #8A968E | text hierarchy |
| line / line-2 | #D5DAD2 / #E6E9E2 | #2A352E / #1F2924 | borders, dividers |
| pitch / pitch-deep / pitch-soft | #1E8A4C / #146238 / #DDEFE3 | #3DB86E / #2C9A58 / #173224 | the one accent: primary actions, "in", good |
| card / card-soft | #E5A800 / #FBF0C9 | #F1BC1E / #3A3010 | warnings, reserves, "owes" |
| red / red-soft | #C8412B / #F8DDD6 | #E8604A / #3D1D17 | late drops, no-shows, danger |

Neutrals carry a slight green bias so they read as chosen. Semantic colours are separate from the accent.

Avatars are generated from a per-user hue in OKLCH so every player is distinct without uploads. Player cards use the same hue as a gradient.

## Layout
- Mobile first at 420px. Max content width 768px. Bottom tab bar under 640px, top nav above.
- 44px minimum tap targets. Inputs are 44px tall.
- Cards (`Panel`) are 1px borders with an 8px radius. Fills and shadows are not used for hierarchy; the accent is.
- Sibling spacing with flex/grid gap, never stacked margins.

## Components
`Button` (primary / secondary / ghost / danger), `LinkButton`, `Panel`, `Pill` (neutral / good / warn / bad / ink), `Eyebrow`, `PageTitle`, `Field`, `Stat`, `Notice`, `EmptyState`, `Avatar`, `ActionForm` + `SubmitButton`, `ShareButtons`, `CrewShell` / `PlainShell`, `SessionCard`, `PlayerCard`, game panels.

## Voice
Second person, short, British. "Can't make it" not "Decline". "Sick note" not "absence". Errors say what to do next. Nothing is called a webhook.

## Motion and access
No decorative animation. `prefers-reduced-motion` honoured. Focus rings 2px accent. Colour is never the only signal (pills carry text). Target WCAG 2.2 AA.
