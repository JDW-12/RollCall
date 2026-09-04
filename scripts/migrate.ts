import { getDb } from "../src/db/client";

getDb()
  .then(() => {
    console.log("Migrations applied.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
