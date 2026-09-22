import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Roll Call data model.
 *
 * Money is stored in pence. Timestamps are stored as epoch milliseconds.
 * A "session" is a single booked occasion (Tuesday 5-a-side, Thursday padel,
 * Saturday fourball, Sunday race). An "auth session" is a login cookie.
 */

const ts = (name: string) =>
  integer(name, { mode: "timestamp_ms" });

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    /** Hue 0-359 used to colour the avatar so every player is visually distinct. */
    hue: integer("hue").notNull().default(150),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const loginCodes = sqliteTable("login_codes", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  /** Failed verification attempts. The code is burned after a handful. */
  attempts: integer("attempts").notNull().default(0),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull(),
});

export const crews = sqliteTable(
  "crews",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Primary sport key from src/domain/sports.ts */
    sport: text("sport").notNull(),
    city: text("city").notNull().default("London"),
    hue: integer("hue").notNull().default(150),
    /** Dropping out inside this window still owes the share. */
    lateDropHours: integer("late_drop_hours").notNull().default(24),
    inviteToken: text("invite_token").notNull(),
    seasonName: text("season_name").notNull().default("Season 1"),
    seasonStartsAt: ts("season_starts_at").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    /** The crew whose shared link brought this organiser in, if any. */
    referredByCrewId: text("referred_by_crew_id"),
    /** Stripe Express account that receives card payments for this crew. Null until an organiser connects one. */
    stripeAccountId: text("stripe_account_id"),
    stripeChargesEnabled: integer("stripe_charges_enabled", { mode: "boolean" }).notNull().default(false),
    /** Secret in the crew's calendar-feed URL. Rotates with the invite link. */
    calendarToken: text("calendar_token"),
    /** JSON list of the crew's own vote categories (see src/domain/ratings.ts). Null means the sport's defaults. */
    ratings: text("ratings"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("crews_slug_idx").on(t.slug),
    uniqueIndex("crews_invite_idx").on(t.inviteToken),
    uniqueIndex("crews_calendar_idx").on(t.calendarToken),
  ],
);

export const crewMembers = sqliteTable(
  "crew_members",
  {
    id: text("id").primaryKey(),
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["organiser", "member"] })
      .notNull()
      .default("member"),
    joinedAt: ts("joined_at").notNull(),
  },
  (t) => [
    uniqueIndex("crew_members_unique").on(t.crewId, t.userId),
    index("crew_members_user_idx").on(t.userId),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    sport: text("sport").notNull(),
    title: text("title").notNull(),
    venueName: text("venue_name").notNull().default(""),
    venueAddress: text("venue_address").notNull().default(""),
    startsAt: ts("starts_at").notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    capacity: integer("capacity").notNull(),
    /** "total": costPence is the whole booking, split between those who play. "per_head": each pays costPence. */
    costMode: text("cost_mode", { enum: ["total", "per_head"] })
      .notNull()
      .default("total"),
    costPence: integer("cost_pence").notNull().default(0),
    rsvpDeadlineAt: ts("rsvp_deadline_at"),
    status: text("status", { enum: ["open", "played", "cancelled"] })
      .notNull()
      .default("open"),
    notes: text("notes").notNull().default(""),
    /** Competition this fixture belongs to: a league, a cup run, or nothing for a kickabout. */
    competitionId: text("competition_id").references(() => competitions.id, { onDelete: "set null" }),
    opponent: text("opponent").notNull().default(""),
    homeAway: text("home_away", { enum: ["home", "away", "neutral"] }).notNull().default("home"),
    /** Cup round or matchday label, e.g. "Quarter-final", "Week 3". */
    round: text("round").notNull().default(""),
    /** Final score. Null until the manager enters it. */
    goalsFor: integer("goals_for"),
    goalsAgainst: integer("goals_against"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull(),
    playedAt: ts("played_at"),
  },
  (t) => [index("sessions_crew_starts_idx").on(t.crewId, t.startsAt), index("sessions_competition_idx").on(t.competitionId)],
);

/**
 * A league or cup the crew plays in. There is no open API for Full-Time, but the league's own admin
 * can issue an official feed snippet, and that feed is what keeps the table live. Failing that the
 * manager pastes the table. Fixtures and results are Roll Call's own, entered by the manager.
 */
export const competitions = sqliteTable(
  "competitions",
  {
    id: text("id").primaryKey(),
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["league", "cup", "friendly"] }).notNull().default("league"),
    /** Where it is run: fa_fulltime | powerleague | other | manual. Drives the badge and the link label. */
    provider: text("provider").notNull().default("manual"),
    /** Public page for the league or division, for the "open the league" link. */
    externalUrl: text("external_url").notNull().default(""),
    /** Official FA Full-Time feed URL, extracted from the league's own embed snippet. Host-checked. */
    embedUrl: text("embed_url").notNull().default(""),
    /** Our team's name as the league spells it, so its row is highlighted in the table. */
    teamName: text("team_name").notNull().default(""),
    /** JSON standings rows, from the league's own feed or pasted by the manager. */
    standings: text("standings"),
    standingsUpdatedAt: ts("standings_updated_at"),
    /** Where the rows came from last: feed | manual. Drives the "live" badge. */
    standingsSource: text("standings_source", { enum: ["feed", "manual"] }).notNull().default("manual"),
    /** The league's official feed address, read out of the snippet the manager pasted. Host-checked. */
    feedUrl: text("feed_url").notNull().default(""),
    /** How to read that feed: fulltime_snippet | leaguerepublic_api | none. */
    feedKind: text("feed_kind", { enum: ["fulltime_snippet", "leaguerepublic_api", "none"] }).notNull().default("none"),
    /** Last successful pull. Null when the feed has never worked. */
    syncedAt: ts("synced_at"),
    /** Why the last pull failed, shown to the organiser. Empty when all is well. */
    syncError: text("sync_error").notNull().default(""),
    /**
     * Shared identity for a division: the feed address, else the league link, else a slug of the
     * name. Every crew playing the same division carries the same key, and the table is read from
     * whichever of them sourced it most recently. So only the first crew in a division ever has to
     * find a table; everyone who joins afterwards gets it for nothing, the same way the golf course
     * library works.
     */
    divisionKey: text("division_key").notNull().default(""),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (t) => [index("competitions_crew_idx").on(t.crewId), index("competitions_sync_idx").on(t.feedKind, t.syncedAt), index("competitions_division_idx").on(t.divisionKey)],
);

/** Per-player numbers from one fixture: goals, assists and the manager's mark out of ten. */
export const matchStats = sqliteTable(
  "match_stats",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    /** Manager's rating, 1-10. Null when they didn't mark this player. */
    rating: integer("rating"),
    updatedAt: ts("updated_at").notNull(),
  },
  (t) => [uniqueIndex("match_stats_unique").on(t.sessionId, t.userId)],
);

export const rsvps = sqliteTable(
  "rsvps",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["in", "reserve", "out"] }).notNull(),
    /** Order in the queue: earlier "in" wins a spot, earlier "reserve" is promoted first. */
    queuedAt: ts("queued_at").notNull(),
    respondedAt: ts("responded_at").notNull(),
    droppedAt: ts("dropped_at"),
    /** True when the drop happened inside the crew's late-drop window while holding a spot. */
    lateDrop: integer("late_drop", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [uniqueIndex("rsvps_unique").on(t.sessionId, t.userId)],
);

export const attendance = sqliteTable(
  "attendance",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attended: integer("attended", { mode: "boolean" }).notNull(),
    confirmedBy: text("confirmed_by").notNull(),
    confirmedAt: ts("confirmed_at").notNull(),
  },
  (t) => [uniqueIndex("attendance_unique").on(t.sessionId, t.userId)],
);

export const ratings = sqliteTable(
  "ratings",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    raterId: text("rater_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Category key from the sport's rating categories, e.g. motm / grafter / howler. */
    category: text("category").notNull(),
    rateeId: text("ratee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("ratings_unique").on(t.sessionId, t.raterId, t.category),
    index("ratings_session_idx").on(t.sessionId),
  ],
);

export const ledger = sqliteTable(
  "ledger",
  {
    id: text("id").primaryKey(),
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => sessions.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** charge: the player owes the crew. payment: the player paid the crew (or the organiser waived it). */
    kind: text("kind", { enum: ["charge", "payment"] }).notNull(),
    /** Always positive. Direction comes from kind. */
    amountPence: integer("amount_pence").notNull(),
    /** Why the charge exists: share / late_drop / no_show / pot, or how it was paid: cash / transfer / waived / card. */
    reason: text("reason").notNull(),
    note: text("note").notNull().default(""),
    /** Provider reference (e.g. Stripe checkout session id) so a webhook can never double-record. */
    externalRef: text("external_ref"),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [
    index("ledger_crew_user_idx").on(t.crewId, t.userId),
    index("ledger_session_idx").on(t.sessionId),
    uniqueIndex("ledger_external_ref_idx").on(t.externalRef),
  ],
);

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["teams", "americano", "stableford", "predictor"],
    }).notNull(),
    /** JSON blob owned by the domain module for that game kind. */
    data: text("data").notNull().default("{}"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (t) => [uniqueIndex("games_unique").on(t.sessionId, t.kind)],
);

export const gameEntries = sqliteTable(
  "game_entries",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    data: text("data").notNull().default("{}"),
    updatedAt: ts("updated_at").notNull(),
  },
  (t) => [uniqueIndex("game_entries_unique").on(t.gameId, t.userId)],
);

export const feed = sqliteTable(
  "feed",
  {
    id: text("id").primaryKey(),
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => sessions.id, {
      onDelete: "cascade",
    }),
    kind: text("kind").notNull(),
    payload: text("payload").notNull().default("{}"),
    createdAt: ts("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("feed_crew_idx").on(t.crewId, t.createdAt)],
);

/** Product events for the pilot dashboard: share clicks, preview views, referral landings. */
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    crewId: text("crew_id"),
    userId: text("user_id"),
    sessionId: text("session_id"),
    payload: text("payload").notNull().default("{}"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("events_kind_idx").on(t.kind, t.createdAt), index("events_crew_idx").on(t.crewId)],
);

/**
 * Golf course cards: par and stroke index per hole for one set of tees. Seeded from a course-data
 * API, a scanned paper card or an organiser typing it in, then corrected by whoever plays there.
 * Shared across crews: once one crew has fixed a course, the next crew gets the corrected version.
 */
export const courses = sqliteTable(
  "courses",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** Club name when it differs from the course (e.g. "Richmond Park" club, "Prince's" course). */
    club: text("club").notNull().default(""),
    address: text("address").notNull().default(""),
    /** Tee set the card is for: "White", "Yellow", "Red"... empty when the source didn't say. */
    tee: text("tee").notNull().default(""),
    /** JSON array of { number, par, strokeIndex }. 9 or 18 holes. */
    holes: text("holes").notNull(),
    /** manual | api | scan */
    source: text("source").notNull().default("manual"),
    /** Provider id (e.g. golfcourseapi course id + tee) so the same card isn't imported twice. */
    externalId: text("external_id"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    /** How many sessions have used this card. Ranks search results. */
    uses: integer("uses").notNull().default(0),
  },
  (t) => [index("courses_name_idx").on(t.name), uniqueIndex("courses_external_idx").on(t.externalId)],
);

export type User = typeof users.$inferSelect;
export type Crew = typeof crews.$inferSelect;
export type CrewMember = typeof crewMembers.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Rsvp = typeof rsvps.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type LedgerEntry = typeof ledger.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GameEntry = typeof gameEntries.$inferSelect;
export type FeedItem = typeof feed.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
export type MatchStat = typeof matchStats.$inferSelect;
