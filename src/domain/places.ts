/**
 * Venue lookup results, provider-agnostic. Mapping functions are pure so they can be tested
 * against recorded responses without touching the network.
 */

export type PlaceHit = { name: string; address: string };

/** Google Places Autocomplete (New): one prediction per suggestion, main text is the venue, secondary is the address. */
export function placesFromGoogle(body: unknown): PlaceHit[] {
  const suggestions = (body as { suggestions?: unknown[] })?.suggestions ?? [];
  const out: PlaceHit[] = [];
  for (const s of suggestions) {
    const p = (s as { placePrediction?: { structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }; text?: { text?: string } } }).placePrediction;
    if (!p) continue;
    const name = (p.structuredFormat?.mainText?.text ?? p.text?.text ?? "").trim();
    if (!name) continue;
    const address = tidyAddress(p.structuredFormat?.secondaryText?.text ?? "");
    out.push({ name, address });
  }
  return dedupe(out);
}

/** Photon (OpenStreetMap): GeoJSON features with flat properties. Named places first, plain addresses after. */
export function placesFromPhoton(body: unknown): PlaceHit[] {
  const features = (body as { features?: unknown[] })?.features ?? [];
  const named: PlaceHit[] = [];
  const plain: PlaceHit[] = [];
  for (const f of features) {
    const p = (f as { properties?: Record<string, unknown> }).properties ?? {};
    const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string).trim() : "");
    const street = [str("housenumber"), str("street")].filter(Boolean).join(" ");
    const locality = str("district") || str("city") || str("county");
    const address = tidyAddress([street, locality, str("postcode")].filter(Boolean).join(", "));
    const name = str("name");
    if (name) named.push({ name, address });
    else if (street) plain.push({ name: street, address: [locality, str("postcode")].filter(Boolean).join(", ") });
  }
  return dedupe([...named, ...plain]);
}

/** Strips the trailing country that Google appends, since every venue here is in the UK. */
export function tidyAddress(a: string): string {
  return a.replace(/,\s*(UK|United Kingdom|England|Scotland|Wales|Northern Ireland)\s*$/i, "").trim();
}

function dedupe(hits: PlaceHit[]): PlaceHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    const k = `${h.name.toLowerCase()}|${h.address.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
