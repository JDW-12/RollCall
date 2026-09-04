import { getDb } from "../src/db/client";
import { seedDemo } from "../src/lib/seed";

getDb()
  .then(async (db) => {
    const done = await seedDemo(db, console.log);
    if (!done) console.log("Seed already present (tuesday-fc). Run `npm run db:reset` to start again.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
