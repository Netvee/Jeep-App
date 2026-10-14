/**
 * Client-side offline pack (localStorage). Holds only what the user explicitly saves or the
 * app snapshots for offline use: vehicle summary, checklists, and saved trail details.
 * It never contains documents, registration numbers or location history.
 */

export type OfflineVehicle = {
  name: string;
  details: [string, string][];
  reminders: { title: string; status: string; reason: string }[];
  installed: string[];
  savedAt: string;
};

export type OfflineTrail = {
  slug: string;
  name: string;
  isDemo: boolean;
  kind: "route" | "pin";
  region: string;
  geometry: number[][] | null;
  start: [number, number];
  facts: [string, string][];
  access: string[];
  reports: { category: string; description: string; observedOn: string; lat: number; lng: number }[];
  source: string;
  savedAt: string;
};

export type OfflineChecklist = { title: string; items: { text: string; done: boolean }[]; savedAt: string };

export type OfflinePack = {
  vehicle?: OfflineVehicle;
  trails: Record<string, OfflineTrail>;
  checklists: Record<string, OfflineChecklist>;
};

const KEY = "shetach-offline-v1";

export function readPack(): OfflinePack {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { trails: {}, checklists: {} };
    const p = JSON.parse(raw) as OfflinePack;
    return { trails: p.trails ?? {}, checklists: p.checklists ?? {}, vehicle: p.vehicle };
  } catch {
    return { trails: {}, checklists: {} };
  }
}

export function writePack(update: (p: OfflinePack) => OfflinePack): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(update(readPack())));
    window.dispatchEvent(new Event("shetach-offline-change"));
    return true;
  } catch {
    return false;
  }
}

export function clearPack() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("shetach-offline-change"));
  } catch {
    /* ignore */
  }
}
