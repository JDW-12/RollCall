import { describe, expect, it, beforeAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import * as schema from "@/db/schema";
import { allow } from "./ratelimit";

type Db = ReturnType<typeof drizzle<typeof schema>>;
let db: Db;

beforeAll(async () => {
  const client = createClient({ url: ":memory:" });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
});

describe("allow", () => {
  it("lets a user through up to the limit inside the window, per kind and per user", async () => {
    for (let i = 0; i < 3; i++) expect(await allow("course_scan", "u1", 3, 60_000, db)).toBe(true);
    expect(await allow("course_scan", "u1", 3, 60_000, db)).toBe(false);
    expect(await allow("places_lookup", "u1", 3, 60_000, db)).toBe(true);
    expect(await allow("course_scan", "u2", 3, 60_000, db)).toBe(true);
  });
  it("forgets hits outside the window", async () => {
    await db.insert(schema.events).values({ id: "old", kind: "course_search", userId: "u3", payload: "{}", createdAt: new Date(Date.now() - 2 * 60_000) });
    expect(await allow("course_search", "u3", 1, 60_000, db)).toBe(true);
    expect(await allow("course_search", "u3", 1, 60_000, db)).toBe(false);
  });
});
