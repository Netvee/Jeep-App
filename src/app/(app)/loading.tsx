/** Shown instantly on navigation while the server renders the next page. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">טוען…</span>
      <div className="space-y-2">
        <div className="h-8 w-56 max-w-full rounded-lg bg-sand-200" />
        <div className="h-4 w-80 max-w-full rounded bg-sand-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 rounded-2xl border border-sand-200 bg-white" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-sand-200 bg-white" />
    </div>
  );
}
