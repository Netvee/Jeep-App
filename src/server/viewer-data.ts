import type { Db } from "@/db/client";
import type { ViewerData } from "@/components/vehicle/viewer";
import { COMPONENTS, SPEC_LABELS, type OverlayKey } from "@/lib/components";
import { ARCHETYPES } from "@/components/vehicle/geometry";
import { archetypeFor, buildShape } from "@/lib/vehicle-shape";
import { PROVENANCE_LABEL, UPGRADE_STATUS_LABEL } from "@/lib/labels";
import { formatDate, formatKm } from "@/lib/units";
import { listUpgrades, getVariantBundle, type Vehicle } from "./repo";
import { loadPartsWithFitment, sortByFitment } from "./catalog";

export async function buildViewerData(db: Db, userId: string, vehicle: Vehicle, showDemo: boolean): Promise<ViewerData> {
  const [bundle, upgrades] = await Promise.all([getVariantBundle(db, vehicle.variantId), listUpgrades(db, userId, vehicle.id)]);
  const spec = (k: string) => bundle?.specs.find((x) => x.key === k)?.value ?? null;
  const archetype = archetypeFor(vehicle.body, bundle?.variant.archetype);

  const installed = upgrades.filter((u) => u.upgrade.status === "installed");
  const planned = upgrades.filter((u) => ["wishlist", "planned", "quoted", "purchased"].includes(u.upgrade.status));

  const toViewer = (u: (typeof upgrades)[number]) => ({
    id: u.upgrade.id,
    name: u.part ? u.part.nameHe : (u.upgrade.customName ?? "שדרוג"),
    componentKey: u.upgrade.componentKey,
    overlay: (u.part?.overlay as OverlayKey | null) ?? null,
    statusLabel: UPGRADE_STATUS_LABEL[u.upgrade.status],
    detail:
      u.upgrade.status === "installed"
        ? [u.upgrade.installedOn && `הותקן ${formatDate(u.upgrade.installedOn)}`, u.upgrade.installedKm != null && `ב-${formatKm(u.upgrade.installedKm)}`, u.upgrade.installedBy].filter(Boolean).join(" · ") || null
        : u.upgrade.reason,
    isDemo: !!u.part?.isDemo,
    liftCm: u.part?.liftCm ?? null,
    tyreSize: u.part?.tyreSize ?? null,
  });

  const baseShape = buildShape({
    archetype,
    wheelbaseMm: vehicle.wheelbaseMm ?? (spec("wheelbase_mm") ? Number(spec("wheelbase_mm")) : null),
    tyreSize: vehicle.tyreSize ?? spec("factory_tyre"),
    liftCm: vehicle.liftCm ?? installed.reduce((m, u) => Math.max(m, u.part?.liftCm ?? 0), 0),
    suspensionFront: spec("suspension_front"),
    suspensionRear: spec("suspension_rear"),
    body: vehicle.body ?? bundle?.variant.body ?? null,
  });
  // planned shape: apply planned lift / tyre size (nominal)
  const plannedLift = planned.reduce((m, u) => Math.max(m, u.part?.liftCm ?? 0), 0);
  const plannedTyre = planned.find((u) => u.part?.tyreSize)?.part?.tyreSize ?? null;
  const plannedShape = buildShape({
    archetype,
    wheelbaseMm: baseShape.wheelbaseMm,
    tyreSize: plannedTyre ?? vehicle.tyreSize ?? spec("factory_tyre"),
    liftCm: Math.max(baseShape.liftCm, (vehicle.liftCm ?? 0) + plannedLift),
    suspensionFront: spec("suspension_front"),
    suspensionRear: spec("suspension_rear"),
    body: vehicle.body ?? bundle?.variant.body ?? null,
  });

  const factory: ViewerData["factory"] = {};
  for (const c of COMPONENTS) {
    const rows = (bundle?.specs ?? []).filter((x) => c.factorySpecKeys.includes(x.key));
    if (c.key === "engine" && bundle?.variant.engine) factory[c.key] = [{ label: "מנוע", value: bundle.variant.engine, sourceLabel: PROVENANCE_LABEL.editorial, verified: false }];
    if (c.key === "transmission" && bundle?.variant.transmission)
      factory[c.key] = [{ label: "תיבה", value: bundle.variant.transmission, sourceLabel: PROVENANCE_LABEL.editorial, verified: false }];
    if (c.key === "transfer_case" && bundle?.variant.drivetrain && !rows.length)
      factory[c.key] = [{ label: "הנעה", value: bundle.variant.drivetrain, sourceLabel: PROVENANCE_LABEL.editorial, verified: false }];
    if (rows.length)
      factory[c.key] = [
        ...(factory[c.key] ?? []),
        ...rows.map((r) => ({
          label: SPEC_LABELS[r.key] ?? r.key,
          value: `${r.value}${r.unit ? ` ${r.unit}` : ""}`,
          sourceLabel: PROVENANCE_LABEL[r.source] + (r.verifiedAt ? ` · ${formatDate(r.verifiedAt)}` : ""),
          verified: r.source === "manufacturer_document",
        })),
      ];
  }
  const parts = sortByFitment(
    await loadPartsWithFitment(db, {
      vehicle,
      variantYears: bundle ? { from: bundle.variant.yearFrom, to: bundle.variant.yearTo } : null,
      showDemo,
    }),
  );
  const candidates: ViewerData["candidates"] = {};
  for (const p of parts) {
    if (p.fit.status === "incompatible") continue;
    (candidates[p.part.componentKey] ??= []).push({
      partId: p.part.id,
      name: p.part.nameHe,
      brand: p.part.brand,
      fitment: p.fit.status,
      priceLabel: p.priceLabel,
      priceKind: p.bestPrice?.kind ?? null,
      isDemo: p.part.isDemo,
    });
  }

  return {
    vehicleId: vehicle.id,
    shape: baseShape,
    plannedShape,
    archetypeLabel: ARCHETYPES[archetype].label,
    linkedToCatalogue: !!bundle,
    installed: installed.map(toViewer),
    planned: planned.map(toViewer),
    factory,
    candidates,
  };
}
