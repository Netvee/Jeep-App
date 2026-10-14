/** Usage: npm run make-admin -- someone@example.com   (stop the dev server first when using embedded PGlite) */
import { eq } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { users } from "../src/db/schema";

const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}
(async () => {
  const { db, close } = await createDb({ url: process.env.DATABASE_URL || undefined, seed: false });
  const r = await db.update(users).set({ role: "admin" }).where(eq(users.email, email)).returning({ id: users.id });
  console.log(r.length ? `✓ ${email} is now an admin` : `✗ no user with email ${email} — register first`);
  await close();
})();
