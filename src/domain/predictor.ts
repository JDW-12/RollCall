/**
 * Race-weekend predictor. Free to play, no prizes, no stakes: bragging rights only.
 * Everyone picks a podium (P1, P2, P3) and a wildcard "first to retire". Scored against the result.
 */

export type Prediction = { podium: [string, string, string]; firstOut: string | null };
export type RaceResult = { finishing: string[]; firstOut: string | null };

export const PREDICTOR_POINTS = {
  exact: 10,
  onPodium: 4,
  firstOut: 5,
} as const;

export function scorePrediction(p: Prediction, r: RaceResult): number {
  let pts = 0;
  const podium = r.finishing.slice(0, 3);
  p.podium.forEach((driver, i) => {
    if (!driver) return;
    if (podium[i] === driver) pts += PREDICTOR_POINTS.exact;
    else if (podium.includes(driver)) pts += PREDICTOR_POINTS.onPodium;
  });
  if (p.firstOut && r.firstOut && p.firstOut === r.firstOut) pts += PREDICTOR_POINTS.firstOut;
  return pts;
}

/** Editable default grid. Organisers change it to match the weekend's entry list. */
export const DEFAULT_GRID: string[] = [
  "Verstappen",
  "Hadjar",
  "Norris",
  "Piastri",
  "Leclerc",
  "Hamilton",
  "Russell",
  "Antonelli",
  "Alonso",
  "Stroll",
  "Gasly",
  "Colapinto",
  "Albon",
  "Sainz",
  "Ocon",
  "Bearman",
  "Hulkenberg",
  "Bortoleto",
  "Lawson",
  "Lindblad",
  "Bottas",
  "Perez",
];

export type PredictorGame = {
  grid: string[];
  result: RaceResult | null;
  /** Lock predictions at this time (lights out). Epoch ms. */
  locksAt: number;
};
