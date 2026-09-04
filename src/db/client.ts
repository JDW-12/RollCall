import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

type Cached = { client: Client; db: Db; ready: Promise<void> };

declare global {
  var __rollcallDb: Cached | undefined;
}

function resolveUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/rollcall.db";
  if (url.startsWith("file:")) {
    const rel = url.slice("file:".length);
    const abs = path.isAbsolute(rel) ? rel : path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    return `file:${abs}`;
  }
  return url;
}

function create(): Cached {
  const client = createClient({
    url: resolveUrl(),
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  const db = drizzle(client, { schema });
  const ready = (async () => {
    await client.execute("PRAGMA foreign_keys = ON");
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
  })();
  return { client, db, ready };
}

/**
 * Returns the shared Drizzle instance once migrations have been applied.
 * Cached on globalThis so Next.js dev hot reloads don't open a new connection each time.
 */
export async function getDb(): Promise<Db> {
  if (!globalThis.__rollcallDb) globalThis.__rollcallDb = create();
  await globalThis.__rollcallDb.ready;
  return globalThis.__rollcallDb.db;
}

export { schema };
