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
    createdAt: ts("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("crews_slug_idx").on(t.slug),
    uniqueIndex("crews_invite_idx").on(t.inviteToken),
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
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull(),
    playedAt: ts("played_at"),
  },
  (t) => [index("sessions_crew_starts_idx").on(t.crewId, t.startsAt)],
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
