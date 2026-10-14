import { getDb } from "@/db";
import { getCurrentUser } from "@/server/auth";
import { getReadableFile } from "@/server/repo";

const INLINE = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "video/mp4", "video/webm", "video/quicktime"]);

/** Serves an uploaded file only to its owner (or if explicitly public). 404 otherwise — no existence leak. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const db = await getDb();
  const f = await getReadableFile(db, user?.id ?? null, id);
  if (!f) return new Response("Not found", { status: 404 });
  const disposition = INLINE.has(f.mime) ? "inline" : "attachment";
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Length": String(f.data.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      "Cache-Control": f.isPublic ? "public, max-age=3600" : "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
