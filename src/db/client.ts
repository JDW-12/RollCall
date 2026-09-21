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

/**
 * A file-based DATABASE_URL on Vercel (typically the placeholder from .env.example imported by the
 * dashboard) would point at a read-only filesystem, so it is treated as "no database" rather than crashing.
 */
function usableDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (process.env.VERCEL && url.startsWith("file:") && !url.startsWith("file:/tmp")) return undefined;
  return url;
}
const sandbox = !usableDatabaseUrl() && !!process.env.VERCEL;

function resolveUrl(): string {
  // On Vercel with no database configured, run as a throwaway sandbox in /tmp (see src/lib/env.ts).
  const url = usableDatabaseUrl() ?? (sandbox ? "file:/tmp/rollcall-sandbox.db" : "file:./data/rollcall.db");
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
    if (sandbox) {
      const { seedDemo } = await import("@/lib/seed");
      await seedDemo(db);
    }
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
