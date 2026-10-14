import type { Db } from "@/db/client";
import type { PlanItem, VehicleFacts } from "@/lib/plan-checks";
import { listUpgrades, getVariantBundle, type Vehicle } from "./repo";
import { loadPartsWithFitment, type PartWithFit } from "./catalog";

export async function loadPlan(db: Db, userId: string, vehicle: Vehicle) {
  const [upgrades, bundle] = await Promise.all([listUpgrades(db, userId, vehicle.id), getVariantBundle(db, vehicle.variantId)]);
  const partIds = [...new Set(upgrades.map((u) => u.part?.id).filter((x): x is string => !!x))];
  const fits = await loadPartsWithFitment(db, {
    vehicle,
    variantYears: bundle ? { from: bundle.variant.yearFrom, to: bundle.variant.yearTo } : null,
    showDemo: true,
    partIds,
  });
  const fitByPart = new Map<string, PartWithFit>(fits.map((f) => [f.part.id, f]));
  const items: PlanItem[] = upgrades.map((u) => ({
    id: u.upgrade.id,
    name: u.part?.nameHe ?? u.upgrade.customName ?? "שדרוג",
    status: u.upgrade.status,
    componentKey: u.upgrade.componentKey,
    overlay: u.part?.overlay ?? null,
    requiredSupporting: u.part?.requiredSupporting ?? [],
    conflictsWith: u.part?.conflictsWith ?? [],
    tyreSize: u.part?.tyreSize ?? null,
    liftCm: u.part?.liftCm ?? null,
    fitment: u.part ? (fitByPart.get(u.part.id)?.fit.status ?? "unconfirmed") : null,
    alternativeGroup: u.upgrade.alternativeGroup,
  }));
  const facts: VehicleFacts = {
    tyreSize: vehicle.tyreSize,
    liftCm: vehicle.liftCm,
    lockers: vehicle.lockers,
    intendedUse: vehicle.intendedUse,
    driverExperience: vehicle.driverExperience,
  };
  return { upgrades, items, facts, fitByPart, bundle };
}
