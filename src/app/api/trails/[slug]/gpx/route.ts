import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { getCurrentUser } from "@/server/auth";
import { toGpx } from "@/lib/gpx";

/** GPX export of a published route. Location pins are not exported as routes. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const db = await getDb();
  const [t] = await db.select().from(s.trails).where(and(eq(s.trails.slug, slug), eq(s.trails.status, "published")));
  if (!t || t.kind !== "route" || !t.geometry?.length) return new Response("Not found", { status: 404 });
  const name = t.isDemo ? `DEMO – NOT A REAL ROUTE – ${t.slug}` : t.nameEn ?? t.slug;
  const desc = t.isDemo
    ? "Synthetic demo geometry. Does not follow any real road or track. Do not use for navigation."
    : `Source: ${t.sourceName}${t.license ? ` (${t.license})` : ""}. Last verified: ${t.lastVerifiedAt ?? "unknown"}. Not turn-by-turn navigation; check access restrictions before travel.`;
  const xml = toGpx({ name, description: desc, coords: t.geometry, creator: "Shetach 4x4" });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t.slug}${t.isDemo ? "-DEMO" : ""}.gpx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
