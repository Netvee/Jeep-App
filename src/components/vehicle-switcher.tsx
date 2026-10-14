"use client";

import { useTransition } from "react";
import { setActiveVehicleAction } from "@/app/actions/vehicles";

export function VehicleSwitcher({ vehicles, activeId }: { vehicles: { id: string; name: string; isDemo: boolean }[]; activeId: string | null }) {
  const [pending, start] = useTransition();
  if (vehicles.length < 2) {
    const v = vehicles[0];
    return <span className="hidden sm:inline text-sm text-sand-300 max-w-48 truncate">{v?.name}</span>;
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">רכב פעיל</span>
      <select
        aria-busy={pending}
        value={activeId ?? ""}
        onChange={(e) => start(() => setActiveVehicleAction(e.target.value))}
        className="max-w-44 sm:max-w-56 rounded-lg bg-charcoal-800 border border-charcoal-600 text-sand-50 min-h-10 px-2 text-sm"
      >
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
            {v.isDemo ? " (הדגמה)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
