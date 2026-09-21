import type { SportKey } from "./sports";

/**
 * Well-known London venues to get a crew started. Names only: the organiser adds the pitch or
 * court number and postcode, and from then on the crew's own history is what gets suggested.
 */
export const LONDON_VENUES: Record<SportKey, string[]> = {
  football: ["Powerleague Shoreditch", "Powerleague Wembley", "Goals Wembley", "Goals Beckenham", "Powerleague Mile End", "Goals Sutton"],
  padel: ["Rocket Padel Battersea", "Padium Canary Wharf", "Padel Social Club Paddington", "Rocket Padel Beckton", "Stratford Padel Club"],
  golf: ["Richmond Park Golf Course", "Topgolf Watford", "Puttshack Bank", "Central London Golf Centre", "Regent's Park Golf"],
  gym: ["PureGym Old Street", "Third Space Canary Wharf", "David Lloyd Acton Park", "The Gym Group Vauxhall"],
  motorsport: ["F1 Arcade St Paul's", "TeamSport Karting Docklands", "Capital Karts Canning Town"],
};

export type VenueSuggestion = { name: string; address: string; count: number };

/** Merge the crew's own venues (most used first) with the curated list, without duplicates. */
export function venueSuggestions(sport: SportKey, history: { venueName: string; venueAddress: string }[]): VenueSuggestion[] {
  const seen = new Map<string, VenueSuggestion>();
  for (const h of history) {
    const name = h.venueName.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const cur = seen.get(key);
    if (cur) {
      cur.count++;
      if (!cur.address && h.venueAddress) cur.address = h.venueAddress;
    } else seen.set(key, { name, address: h.venueAddress ?? "", count: 1 });
  }
  const own = [...seen.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const curated = (LONDON_VENUES[sport] ?? []).filter((n) => !seen.has(n.toLowerCase())).map((name) => ({ name, address: "", count: 0 }));
  return [...own, ...curated].slice(0, 8);
}
