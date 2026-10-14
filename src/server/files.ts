import type { Db } from "@/db/client";
import { files } from "@/db/schema";
import { validateUpload, type UploadKind } from "./uploads";

export async function storeUpload(db: Db, ownerId: string, file: File, allowed: UploadKind[], opts: { isPublic?: boolean } = {}) {
  const v = await validateUpload(file, allowed);
  const [row] = await db
    .insert(files)
    .values({ ownerId, mime: v.mime, sizeBytes: v.buffer.length, filename: v.filename, data: v.buffer, isPublic: !!opts.isPublic })
    .returning({ id: files.id });
  return { id: row.id, kind: v.kind, mime: v.mime };
}
