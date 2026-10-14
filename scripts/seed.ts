/** Runs migrations and seeds the reference catalogue (+ demo data unless SEED_DEMO_DATA=false). Idempotent. */
import { createDb } from "../src/db/client";

(async () => {
  const { close } = await createDb({ url: process.env.DATABASE_URL || undefined, demo: process.env.SEED_DEMO_DATA !== "false" });
  console.log("✓ database migrated and seeded");
  await close();
})();
