import { FileText } from "lucide-react";
import { deleteAttachmentAction } from "@/app/actions/vehicles";
import { formatDate } from "@/lib/units";

export type AttachmentRow = {
  a: { id: string; fileId: string; kind: string; title: string | null; createdAt: Date };
  mime: string;
  filename: string;
  size: number;
};

const KIND = { photo: "תמונה", receipt: "קבלה", document: "מסמך", audio: "הקלטה", video: "וידאו" } as Record<string, string>;

export function AttachmentList({ rows, empty = "אין קבצים מצורפים." }: { rows: AttachmentRow[]; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-charcoal-500">{empty}</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(({ a, mime, filename, size }) => {
        const url = `/api/files/${a.fileId}`;
        return (
          <li key={a.id} className="rounded-xl border border-sand-200 bg-white overflow-hidden flex flex-col">
            {mime.startsWith("image/") && mime !== "image/heic" ? (
              <a href={url} target="_blank" rel="noopener" className="block bg-sand-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={a.title ?? filename} loading="lazy" className="w-full aspect-video object-cover" />
              </a>
            ) : mime.startsWith("audio/") ? (
              <audio controls preload="none" src={url} className="w-full mt-3 px-2" />
            ) : mime.startsWith("video/") ? (
              <video controls preload="none" src={url} className="w-full aspect-video bg-charcoal-900" />
            ) : (
              <a href={url} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-6 bg-sand-50 hover:bg-sand-100">
                <FileText className="text-olive-600" /> <span className="text-sm truncate">{filename}</span>
              </a>
            )}
            <div className="p-3 flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.title ?? filename}</div>
                <div className="text-xs text-charcoal-500">
                  {KIND[a.kind] ?? a.kind} · {formatDate(a.createdAt)} · {(size / 1024 / 1024).toFixed(1)}MB
                </div>
              </div>
              <form action={deleteAttachmentAction}>
                <input type="hidden" name="id" value={a.id} />
                <button className="text-xs text-danger-700 hover:underline min-h-9 px-1" aria-label={`מחיקת ${a.title ?? filename}`}>
                  מחיקה
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
