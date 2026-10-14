import type { ViewKey } from "@/lib/components";
import { PHOTO_SETS } from "./photo-sets";

/** Static illustration from a photo set (no hooks — usable from server components). */
export function VehiclePhoto({ set, view = "side", alt, className, priority }: { set: string; view?: ViewKey; alt: string; className?: string; priority?: boolean }) {
  const v = PHOTO_SETS[set]?.views[view];
  if (!v) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={v.src} width={v.w} height={v.h} alt={alt} className={className} loading={priority ? "eager" : "lazy"} decoding="async" />;
}
