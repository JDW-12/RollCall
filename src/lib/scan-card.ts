import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CourseError, validateHoles, type CourseCard } from "@/domain/courses";

/**
 * Reads a photo of a paper scorecard and returns the course card for the organiser to confirm.
 * Covers the courses no data provider has, which are exactly the ones a Tuesday crew plays.
 * Needs ANTHROPIC_API_KEY; the UI hides the option when it isn't set.
 */

export function scanConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const Card = z.object({
  course_name: z.string().describe("Name of the course or club as printed on the card"),
  club_name: z.string().describe("Club name if printed separately from the course name, else empty"),
  tee: z.string().describe("Tee set the pars belong to, e.g. White, Yellow, Red. Empty if not shown"),
  holes: z.array(
    z.object({
      number: z.number().int(),
      par: z.number().int(),
      stroke_index: z.number().int().describe("Stroke index / handicap for the hole. 0 if the card has no SI column"),
    }),
  ),
});

export type ScanResult = { card: CourseCard; warnings: string[] };

const MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export async function scanScorecard(bytes: Uint8Array, mediaType: string): Promise<ScanResult> {
  if (!scanConfigured()) throw new CourseError("Scorecard scanning isn't switched on.");
  const mt = MEDIA.find((m) => m === mediaType);
  if (!mt) throw new CourseError("Upload a JPEG, PNG or WebP photo of the card.");
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    system:
      "You read UK golf scorecards. Return the course name, club, the tee set the par row belongs to, and one entry per hole with its par and stroke index. " +
      "If the card lists several tee rows, use the men's white or yellow tees unless only one is present. If there is no stroke index column, set stroke_index to 0 for every hole. " +
      "Read the printed numbers exactly; do not guess a hole that is not visible. A card has 9 or 18 holes.",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mt, data: Buffer.from(bytes).toString("base64") } },
          { type: "text", text: "Extract this scorecard." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(Card) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new CourseError("Couldn't read that card. Try a straighter, better-lit photo.");
  const out = response.parsed_output;
  const warnings: string[] = [];
  let holes = out.holes.map((h, i) => ({ number: i + 1, par: h.par, strokeIndex: h.stroke_index }));
  if (holes.length !== 9 && holes.length !== 18) throw new CourseError(`Read ${holes.length} holes; a card has 9 or 18. Try a clearer photo.`);
  if (holes.some((h) => h.strokeIndex < 1)) {
    const { defaultStrokeIndexes } = await import("@/domain/courses");
    const si = defaultStrokeIndexes(holes.map((h) => h.par));
    holes = holes.map((h, i) => ({ ...h, strokeIndex: si[i] }));
    warnings.push("No stroke index column was read, so indexes were filled in by par. Check them against the card.");
  }
  try {
    holes = validateHoles(holes);
  } catch (e) {
    if (e instanceof CourseError) throw new CourseError(`${e.message} Check the photo and try again.`);
    throw e;
  }
  return { card: { name: out.course_name.trim() || "Scanned course", club: out.club_name.trim(), address: "", tee: out.tee.trim(), holes }, warnings };
}
