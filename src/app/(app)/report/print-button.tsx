"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="w-full rounded-xl bg-ember-600 hover:bg-ember-700 text-white min-h-11 mt-3 font-medium">
      הדפסה / שמירה כ-PDF
    </button>
  );
}
