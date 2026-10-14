/**
 * Upload validation. File type is decided from magic bytes (never from the client's
 * filename or declared MIME). Image metadata (EXIF incl. GPS) is stripped from JPEG/PNG
 * so photos never leak precise location.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type UploadKind = "image" | "pdf" | "audio" | "video";

export type Sniffed = { mime: string; kind: UploadKind; ext: string };

export function sniff(buf: Buffer): Sniffed | null {
  const b = buf;
  const ascii = (start: number, len: number) => b.subarray(start, start + len).toString("latin1");
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", kind: "image", ext: "jpg" };
  if (b[0] === 0x89 && ascii(1, 3) === "PNG") return { mime: "image/png", kind: "image", ext: "png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { mime: "image/webp", kind: "image", ext: "webp" };
  if (ascii(0, 4) === "%PDF") return { mime: "application/pdf", kind: "pdf", ext: "pdf" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return { mime: "audio/wav", kind: "audio", ext: "wav" };
  if (ascii(0, 4) === "OggS") return { mime: "audio/ogg", kind: "audio", ext: "ogg" };
  if (ascii(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { mime: "audio/mpeg", kind: "audio", ext: "mp3" };
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { mime: "video/webm", kind: "video", ext: "webm" };
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (["heic", "heix", "mif1", "msf1", "hevc"].includes(brand)) return { mime: "image/heic", kind: "image", ext: "heic" };
    if (brand.startsWith("M4A")) return { mime: "audio/mp4", kind: "audio", ext: "m4a" };
    if (brand === "qt  ") return { mime: "video/quicktime", kind: "video", ext: "mov" };
    return { mime: "video/mp4", kind: "video", ext: "mp4" };
  }
  return null;
}

/** Removes APP1 (EXIF/XMP) and APP13 (IPTC) segments from a JPEG. */
export function stripJpegMetadata(buf: Buffer): Buffer {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return buf;
  const out: Buffer[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) return buf; // unexpected structure: keep original
    const marker = buf[i + 1];
    if (marker === 0xda) {
      out.push(buf.subarray(i)); // start of scan: rest is image data
      return Buffer.concat(out);
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    const seg = buf.subarray(i, i + 2 + len);
    if (marker !== 0xe1 && marker !== 0xed) out.push(seg);
    i += 2 + len;
  }
  return buf;
}

/** Removes eXIf, tEXt, iTXt, zTXt chunks from a PNG. */
export function stripPngMetadata(buf: Buffer): Buffer {
  const out: Buffer[] = [buf.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.subarray(i + 4, i + 8).toString("latin1");
    const chunk = buf.subarray(i, i + 12 + len);
    if (!["eXIf", "tEXt", "iTXt", "zTXt"].includes(type)) out.push(chunk);
    i += 12 + len;
    if (type === "IEND") break;
  }
  return Buffer.concat(out);
}

export type ValidatedUpload = { buffer: Buffer; mime: string; kind: UploadKind; filename: string };

export async function validateUpload(file: File, allowed: UploadKind[]): Promise<ValidatedUpload> {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) throw new UploadError("לא נבחר קובץ");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("הקובץ גדול מ-10MB");
  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  const s = sniff(buffer);
  if (!s || !allowed.includes(s.kind)) {
    throw new UploadError(`סוג קובץ לא נתמך. מותר: ${allowed.map((k) => KIND_LABEL[k]).join(", ")}`);
  }
  if (s.mime === "image/jpeg") buffer = stripJpegMetadata(buffer);
  if (s.mime === "image/png") buffer = stripPngMetadata(buffer);
  const base = (file.name || "file").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 80);
  return { buffer, mime: s.mime, kind: s.kind, filename: base };
}

const KIND_LABEL: Record<UploadKind, string> = { image: "תמונה", pdf: "PDF", audio: "הקלטה", video: "וידאו" };

export class UploadError extends Error {}
