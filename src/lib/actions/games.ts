"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db/client";
import { requireCrewAction } from "@/lib/access";
import { newId } from "@/lib/ids";
import { getSessionBundle, getCrewTable } from "@/lib/queries";
import { balanceTeams } from "@/domain/teams";
import { generateAmericano, type Americano } from "@/domain/americano";
import { defaultHoles, resizeStrokes, type StablefordCard } from "@/domain/stableford";
import { CourseError, validateHoles, type CourseCard } from "@/domain/courses";
import { correctCourse, resolveCourseRef, upsertCourse } from "@/lib/golf-courses";
import { DEFAULT_GRID, type PredictorGame, type Prediction } from "@/domain/predictor";
import { playing } from "@/domain/rsvp";
import { act, addFeed, str, uiError, type ActionState } from "./shared";

async function upsertGame(sessionId: string, kind: schema.Game["kind"], data: unknown) {
  const db = await getDb();
  const now = new Date();
  const existing = (await db.select().from(schema.games).where(and(eq(schema.games.sessionId, sessionId), eq(schema.games.kind, kind))).limit(1))[0];
  if (existing) {
    await db.update(schema.games).set({ data: JSON.stringify(data), updatedAt: now }).where(eq(schema.games.id, existing.id));
    return existing.id;
  }
  const id = newId();
  await db.insert(schema.games).values({ id, sessionId, kind, data: JSON.stringify(data), createdAt: now, updatedAt: now });
  return id;
}

async function loadForGame(sessionId: string, organiser = true) {
  const bundle = await getSessionBundle(sessionId);
  if (!bundle) uiError("That session doesn't exist any more.");
  const ctx = await requireCrewAction(bundle.session.crewId, { organiser });
  return { bundle, ctx };
}

/** Football: split whoever is in tonight into two sides. Re-roll with a new seed. */
export async function makeTeams(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { bundle, ctx } = await loadForGame(str(fd, "sessionId"));
    const { rows } = await getCrewTable(ctx.crew);
    const inIds = playing(
      bundle.rsvps.map((r) => ({ userId: r.userId, status: r.status, queuedAt: r.queuedAt.getTime(), respondedAt: 0, droppedAt: null, lateDrop: r.lateDrop })),
    ).map((r) => r.userId);
    if (inIds.length < 2) uiError("Need at least two people in before picking teams.");
    const seed = Number(str(fd, "seed")) || Math.floor(Math.random() * 1_000_000);
    const teams = balanceTeams(
      inIds.map((id) => ({ userId: id, form: rows.find((r) => r.userId === id)?.form ?? null })),
      seed,
    );
    await upsertGame(bundle.session.id, "teams", teams);
    revalidatePath(`/crew/${ctx.crew.slug}/s/${bundle.session.id}`);
    return { ok: true };
  });
}

/** Padel: generate the americano schedule for everyone in. */
export async function startAmericano(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { bundle, ctx } = await loadForGame(str(fd, "sessionId"));
    const inIds = bundle.rsvps.filter((r) => r.status === "in").map((r) => r.userId);
    const points = Number(str(fd, "pointsPerMatch")) || 16;
    const rounds = Math.max(1, Math.min(12, Number(str(fd, "rounds")) || 0)) || undefined;
    if (inIds.length < 4) uiError("An americano needs at least four players in.");
    const game = generateAmericano(inIds, { pointsPerMatch: points, rounds });
    await upsertGame(bundle.session.id, "americano", game);
    await addFeed(ctx.crew.id, bundle.session.id, "americano_started", { players: inIds.length });
    revalidatePath(`/crew/${ctx.crew.slug}/s/${bundle.session.id}`);
    return { ok: true };
  });
}

export async function scoreAmericano(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { bundle, ctx } = await loadForGame(str(fd, "sessionId"));
    const game = bundle.games.find((g) => g.kind === "americano");
    if (!game) uiError("No americano running.");
    const data = JSON.parse(game.data) as Americano;
    const idx = Number(str(fd, "match"));
    const m = data.matches[idx];
    if (!m) uiError("That match doesn't exist.");
    const a = str(fd, "scoreA");
    const b = str(fd, "scoreB");
    m.scoreA = a === "" ? null : Math.max(0, Math.min(99, Number(a) || 0));
    m.scoreB = b === "" ? null : Math.max(0, Math.min(99, Number(b) || 0));
    await upsertGame(bundle.session.id, "americano", data);
    revalidatePath(`/crew/${ctx.crew.slug}/s/${bundle.session.id}`);
    return { ok: true };
  });
}

/** Golf: create or update the Stableford card. Any player can enter their own strokes; organisers can edit all. */
export async function saveStableford(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { bundle, ctx } = await loadForGame(str(fd, "sessionId"), false);
    const existing = bundle.games.find((g) => g.kind === "stableford");
    const card: StablefordCard = existing ? (JSON.parse(existing.data) as StablefordCard) : { holes: defaultHoles(), handicaps: {}, strokes: {} };
    const inIds = bundle.rsvps.filter((r) => r.status === "in").map((r) => r.userId);
    const targetUser = str(fd, "userId") || ctx.user.id;
    if (targetUser !== ctx.user.id && !ctx.isOrganiser) uiError("You can only enter your own card.");
    if (!inIds.includes(targetUser)) uiError("That player isn't in this round.");

    const mode = str(fd, "mode");
    if (mode === "holes") {
      if (!ctx.isOrganiser) uiError("Only an organiser can edit the course.");
      try {
        card.holes = validateHoles(
          card.holes.map((h, i) => ({
            number: h.number,
            par: Number(str(fd, `par_${i}`)) || h.par,
            strokeIndex: Number(str(fd, `si_${i}`)) || h.strokeIndex,
            yards: h.yards,
          })),
        );
      } catch (e) {
        if (e instanceof CourseError) uiError(e.message);
        throw e;
      }
      // A correction to a library card fixes it for everyone who plays there next.
      if (card.course?.id) await correctCourse(card.course.id, card.holes);
    } else {
      const hcp = str(fd, "handicap");
      if (hcp !== "") card.handicaps[targetUser] = Math.max(0, Math.min(54, Number(hcp) || 0));
      const strokes: (number | null)[] = card.holes.map((_, i) => {
        const v = str(fd, `h_${i}`);
        if (v === "" || v === "-") return null;
        return Math.max(1, Math.min(15, Number(v) || 0)) || null;
      });
      card.strokes[targetUser] = strokes;
      const drive = str(fd, "longestDrive");
      const lost = str(fd, "ballsLost");
      card.extras ??= {};
      card.extras[targetUser] = {
        longestDriveYards: drive === "" ? null : Math.max(0, Math.min(450, Number(drive) || 0)) || null,
        ballsLost: lost === "" ? null : Math.max(0, Math.min(60, Number(lost) || 0)),
      };
    }
    // Submitting is saving plus "I'm done": it marks the card and takes the player to the leaderboard.
    const submit = mode !== "holes" && str(fd, "submit") === "1";
    if (submit) {
      if (!(card.strokes[targetUser] ?? []).some((x) => x !== null)) uiError("Put at least one hole in before you submit the round.");
      card.submitted ??= {};
      card.submitted[targetUser] = Date.now();
    }
    await upsertGame(bundle.session.id, "stableford", card);
    revalidatePath(`/crew/${ctx.crew.slug}`, "layout");
    if (submit) redirect(`/crew/${ctx.crew.slug}/table?round=${bundle.session.id}${targetUser !== ctx.user.id ? `&player=${targetUser}` : ""}`);
    return { ok: true, message: "Card saved." };
  });
}

/**
 * Golf: organiser picks the course card. From the library (ref = course id), from the provider
 * (ref = provider reference, re-fetched server side), or typed / scanned holes sent as JSON, which
 * can also be saved to the library so the next crew finds them.
 */
export async function setCourse(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { bundle, ctx } = await loadForGame(str(fd, "sessionId"));
    const existing = bundle.games.find((g) => g.kind === "stableford");
    const card: StablefordCard = existing ? (JSON.parse(existing.data) as StablefordCard) : { holes: defaultHoles(), handicaps: {}, strokes: {} };
    const mode = str(fd, "mode");
    try {
      if (mode === "library" || mode === "api") {
        const picked = await resolveCourseRef(mode, str(fd, "ref"), ctx.user.id);
        if (!picked)
          uiError(
            mode === "library"
              ? "That course isn't in the library any more."
              : "The course database knows this course but doesn't have its hole-by-hole card. Type the pars in below — it's saved for everyone who plays there after you.",
          );
        card.holes = picked.holes;
        card.course = picked.course;
      } else if (mode === "manual" || mode === "scan") {
        const holes = validateHoles(JSON.parse(str(fd, "holes") || "[]"));
        const typed: CourseCard = { name: str(fd, "name"), club: str(fd, "club"), address: str(fd, "address"), tee: str(fd, "tee"), holes };
        if (!typed.name) uiError("Give the course a name so the crew knows which card this is.");
        card.holes = holes;
        if (str(fd, "save") === "1") {
          const row = await upsertCourse(typed, { source: mode, userId: ctx.user.id });
          card.course = { id: row.id, name: row.name, tee: row.tee };
        } else card.course = { id: null, name: typed.name, tee: typed.tee };
      } else uiError("Pick a course first.");
    } catch (e) {
      if (e instanceof CourseError) uiError(e.message);
      if (e instanceof SyntaxError) uiError("That card didn't come through properly. Try again.");
      throw e;
    }
    card.strokes = resizeStrokes(card.strokes, card.holes.length);
    await upsertGame(bundle.session.id, "stableford", card);
    revalidatePath(`/crew/${ctx.crew.slug}/s/${bundle.session.id}`);
    return { ok: true, message: `Course set: ${card.course?.name ?? "custom card"}.` };
  });
}

/** Race weekend: organiser sets the grid and lock time. */
export async function setupPredictor(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { bundle, ctx } = await loadForGame(str(fd, "sessionId"));
    const existing = bundle.games.find((g) => g.kind === "predictor");
    const prev = existing ? (JSON.parse(existing.data) as PredictorGame) : null;
    const gridRaw = str(fd, "grid");
    const grid = gridRaw
      ? gridRaw.split(/\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, 30)
      : (prev?.grid ?? DEFAULT_GRID);
    if (grid.length < 3) uiError("Need at least three drivers on the grid.");
    const game: PredictorGame = { grid, result: prev?.result ?? null, locksAt: bundle.session.startsAt.getTime() };
    await upsertGame(bundle.session.id, "predictor", game);
    revalidatePath(`/crew/${ctx.crew.slug}/s/${bundle.session.id}`);
    return { ok: true, message: "Grid set. Predictions are open." };
  });
}

export async function submitPrediction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { bundle, ctx } = await loadForGame(str(fd, "sessionId"), false);
    const game = bundle.games.find((g) => g.kind === "predictor");
    if (!game) uiError("The organiser hasn't opened predictions yet.");
    const data = JSON.parse(game.data) as PredictorGame;
    // Lock follows the session's start time, so moving the race moves the lock.
    if (data.result) uiError("The result is in. Predictions are closed.");
    if (Date.now() >= bundle.session.startsAt.getTime()) uiError("Lights out. Predictions are locked.");
    const podium: [string, string, string] = [str(fd, "p1"), str(fd, "p2"), str(fd, "p3")];
    if (podium.some((d) => !data.grid.includes(d))) uiError("Pick three drivers from the grid.");
    if (new Set(podium).size !== 3) uiError("Three different drivers, please.");
    const firstOut = str(fd, "firstOut") || null;
    if (firstOut && !data.grid.includes(firstOut)) uiError("First to retire must be on the grid.");
    const entry: Prediction = { podium, firstOut };
    const db = await getDb();
    const existing = (await db.select().from(schema.gameEntries).where(and(eq(schema.gameEntries.gameId, game.id), eq(schema.gameEntries.userId, ctx.user.id))).limit(1))[0];
    if (existing) await db.update(schema.gameEntries).set({ data: JSON.stringify(entry), updatedAt: new Date() }).where(eq(schema.gameEntries.id, existing.id));
    else await db.insert(schema.gameEntries).values({ id: newId(), gameId: game.id, userId: ctx.user.id, data: JSON.stringify(entry), updatedAt: new Date() });
    revalidatePath(`/crew/${ctx.crew.slug}/s/${bundle.session.id}`);
    return { ok: true, message: "Locked in." };
  });
}

export async function setRaceResult(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { bundle, ctx } = await loadForGame(str(fd, "sessionId"));
    const game = bundle.games.find((g) => g.kind === "predictor");
    if (!game) uiError("No predictor running.");
    const data = JSON.parse(game.data) as PredictorGame;
    const finishing = [str(fd, "r1"), str(fd, "r2"), str(fd, "r3")].filter(Boolean);
    if (finishing.length !== 3 || new Set(finishing).size !== 3) uiError("Enter the three podium finishers.");
    data.result = { finishing, firstOut: str(fd, "firstOut") || null };
    await upsertGame(bundle.session.id, "predictor", data);
    await addFeed(ctx.crew.id, bundle.session.id, "race_result", { podium: finishing });
    revalidatePath(`/crew/${ctx.crew.slug}/s/${bundle.session.id}`);
    return { ok: true, message: "Result in. Scores updated." };
  });
}
