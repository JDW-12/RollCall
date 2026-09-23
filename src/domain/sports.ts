export type SportKey = "football" | "padel" | "golf" | "gym" | "motorsport";

export type RatingCategory = {
  key: string;
  /** Label shown on the vote screen and on cards. */
  label: string;
  /** Question asked after the session. */
  prompt: string;
  /** Points a single vote adds to the crew table. Zero means banter only. */
  points: number;
  /** Short stat label for the player card (3 letters). */
  stat: string;
};

export type GameKind = "teams" | "americano" | "stableford" | "predictor";

/** Where to go and find a league, a club or a venue for this sport. Plain links out, no API. */
export type Finder = { label: string; url: string; blurb: string };

export type SportDef = {
  key: SportKey;
  label: string;
  /** What one occasion is called: "game", "match", "round", "session", "race". */
  noun: string;
  /** Verb used on the RSVP button. */
  inVerb: string;
  defaultCapacity: number;
  defaultDurationMin: number;
  defaultCostMode: "total" | "per_head";
  /** Typical London cost, used only to prefill the form. */
  defaultCostPence: number;
  venueHint: string;
  ratings: RatingCategory[];
  /** Points per vote by position when a crew customises its categories. Defaults to 2, 1, then banter. */
  votePoints?: number[];
  games: GameKind[];
  /** Short line used in marketing and crew setup. */
  pitch: string;
  /** League and club finders for this sport, shown when a crew has no competition linked yet. */
  finders: Finder[];
};

export const SPORTS: Record<SportKey, SportDef> = {
  football: {
    key: "football",
    label: "Football",
    noun: "game",
    inVerb: "I'm in",
    defaultCapacity: 10,
    defaultDurationMin: 60,
    defaultCostMode: "total",
    defaultCostPence: 6500,
    venueHint: "e.g. Powerleague Shoreditch, pitch 3",
    ratings: [
      { key: "motm", label: "Player of the match", prompt: "Who was player of the match?", points: 2, stat: "MOT" },
      { key: "grafter", label: "Ran the hardest", prompt: "Who ran the hardest?", points: 1, stat: "GRF" },
      { key: "howler", label: "Worst miss", prompt: "Worst miss of the night?", points: 0, stat: "HWL" },
    ],
    games: ["teams"],
    pitch: "5-a-side every week with the same lot. Ten spots, a court to pay for, and someone always drops on the day.",
    finders: [
      { label: "FA Full-Time", url: "https://fulltime.thefa.com/", blurb: "Grassroots league tables, fixtures and results. Find your division, then paste the table in." },
      { label: "Powerleague", url: "https://www.powerleague.co.uk/league-fixtures", blurb: "5, 6 and 7-a-side leagues at their centres. Your league page has the table and fixtures." },
      { label: "The FA", url: "https://www.thefa.com/", blurb: "Find a team, a league or a session near you." },
    ],
  },
  padel: {
    key: "padel",
    label: "Padel",
    noun: "match",
    inVerb: "I'm in",
    defaultCapacity: 4,
    defaultDurationMin: 90,
    defaultCostMode: "total",
    defaultCostPence: 6000,
    venueHint: "e.g. Rocket Padel Battersea, court 2",
    ratings: [
      { key: "motm", label: "Player of the night", prompt: "Who was player of the night?", points: 2, stat: "MOT" },
      { key: "grafter", label: "Best at the net", prompt: "Who owned the net?", points: 1, stat: "NET" },
      { key: "howler", label: "Shouted 'mine' then missed", prompt: "Who shouted 'mine' and missed?", points: 0, stat: "HWL" },
    ],
    games: ["americano"],
    pitch: "A court for four at peak time is gold dust. When one drops, the whole booking is at risk.",
    finders: [
      { label: "LTA", url: "https://www.lta.org.uk/", blurb: "Find padel venues, leagues and box leagues near you." },
    ],
  },
  golf: {
    key: "golf",
    label: "Golf",
    noun: "round",
    inVerb: "Count me in",
    defaultCapacity: 4,
    defaultDurationMin: 240,
    defaultCostMode: "per_head",
    defaultCostPence: 3500,
    venueHint: "e.g. Richmond Park, Prince's course, 08:10 tee",
    // Every golf vote scores: the round is judged on the card, and the votes are the extra glory on top.
    ratings: [
      { key: "motm", label: "Best golfer", prompt: "Who was the best golfer out there?", points: 3, stat: "BST" },
      { key: "grafter", label: "Longest driver", prompt: "Who hit it furthest off the tee?", points: 2, stat: "LNG" },
      { key: "howler", label: "Shot of the day", prompt: "Whose shot are we still talking about?", points: 2, stat: "SOD" },
    ],
    votePoints: [3, 2, 2, 1, 1],
    games: ["stableford"],
    pitch: "Fourballs, society days and the Stableford scorecard with money on it, all in one place.",
    finders: [
      { label: "England Golf", url: "https://www.englandgolf.org/", blurb: "Find a club, a society day or your handicap record." },
    ],
  },
  gym: {
    key: "gym",
    label: "Gym",
    noun: "session",
    inVerb: "I'll be there",
    defaultCapacity: 6,
    defaultDurationMin: 75,
    defaultCostMode: "per_head",
    defaultCostPence: 0,
    venueHint: "e.g. PureGym Old Street, 07:00",
    ratings: [
      { key: "motm", label: "Lifter of the day", prompt: "Who lifted best today?", points: 2, stat: "LFT" },
      { key: "grafter", label: "Best spotter", prompt: "Best spotter?", points: 1, stat: "SPT" },
      { key: "howler", label: "Longest rest between sets", prompt: "Who took the longest 'rest'?", points: 0, stat: "RST" },
    ],
    games: [],
    pitch: "The crew that trains together turns up. Streaks and a table beat a fitness app you open alone.",
    finders: [],
  },
  motorsport: {
    key: "motorsport",
    label: "Race weekend",
    noun: "race",
    inVerb: "Watching",
    defaultCapacity: 12,
    defaultDurationMin: 150,
    defaultCostMode: "per_head",
    defaultCostPence: 0,
    venueHint: "e.g. Dan's flat, or The Fox, Islington",
    ratings: [
      { key: "motm", label: "Best call", prompt: "Whose call was best this weekend?", points: 2, stat: "CAL" },
      { key: "grafter", label: "Best banter", prompt: "Best banter of the race?", points: 1, stat: "BNT" },
      { key: "howler", label: "Worst take", prompt: "Worst take of the weekend?", points: 0, stat: "TAK" },
    ],
    games: ["predictor"],
    pitch: "Sunday race with the group chat. Podium predictions, bragging rights, no bookies.",
    finders: [
      { label: "Motorsport UK", url: "https://www.motorsportuk.org/", blurb: "Find a club, a licence or a race meeting." },
    ],
  },
};

export const SPORT_KEYS = Object.keys(SPORTS) as SportKey[];

export function isSportKey(v: string): v is SportKey {
  return v in SPORTS;
}

export function sportOf(key: string): SportDef {
  return isSportKey(key) ? SPORTS[key] : SPORTS.football;
}
