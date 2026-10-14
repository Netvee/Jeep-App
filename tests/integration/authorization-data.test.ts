import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, and } from "drizzle-orm";
import { createDb, type Db } from "@/db/client";
import * as s from "@/db/schema";
import {
  getOwnedVehicle,
  listUpgrades,
  getOwnedUpgrade,
  getOwnedServiceRecord,
  getOwnedTrip,
  getOwnedQuote,
  getOwnedTask,
  getReadableFile,
  listAttachments,
  NotFoundError,
} from "@/server/repo";
import { loadPartsWithFitment } from "@/server/catalog";
import { importCatalogue } from "@/db/seed/import-catalogue";
import { seedDemoGarage } from "@/server/demo-garage";
import { hashPassword, verifyPassword } from "@/server/password";

let db: Db;
let close: () => Promise<void>;
let alice: string;
let bob: string;
let aliceVehicle: string;

beforeAll(async () => {
  ({ db, close } = await createDb({ memory: true, demo: true }));
  const mk = async (email: string) => (await db.insert(s.users).values({ email, displayName: email, passwordHash: await hashPassword("correct horse battery") }).returning())[0].id;
  alice = await mk("alice@example.com");
  bob = await mk("bob@example.com");
  aliceVehicle = (await seedDemoGarage(db, alice)).id;
});

afterAll(async () => {
  await close();
});

describe("private-data authorization", () => {
  it("lets the owner read their vehicle and hides it from other users", async () => {
    expect(await getOwnedVehicle(db, alice, aliceVehicle)).not.toBeNull();
    expect(await getOwnedVehicle(db, bob, aliceVehicle)).toBeNull();
  });

  it("refuses to list another user's upgrades", async () => {
    await expect(listUpgrades(db, bob, aliceVehicle)).rejects.toBeInstanceOf(NotFoundError);
    expect((await listUpgrades(db, alice, aliceVehicle)).length).toBeGreaterThan(0);
  });

  it("scopes upgrades, service records, tasks, trips and quotes by owner", async () => {
    const [u] = await db.select().from(s.vehicleUpgrades).where(eq(s.vehicleUpgrades.vehicleId, aliceVehicle)).limit(1);
    const [r] = await db.select().from(s.serviceRecords).where(eq(s.serviceRecords.vehicleId, aliceVehicle)).limit(1);
    const [t] = await db.select().from(s.maintenanceTasks).where(eq(s.maintenanceTasks.vehicleId, aliceVehicle)).limit(1);
    const [trip] = await db.select().from(s.trips).where(eq(s.trips.userId, alice)).limit(1);
    const [q] = await db
      .insert(s.quotes)
      .values({ userId: alice, vehicleId: aliceVehicle, title: "q", quotedOn: "2026-01-01", items: [{ description: "x", amount: 1 }] })
      .returning();
    expect(await getOwnedUpgrade(db, alice, u.id)).not.toBeNull();
    expect(await getOwnedUpgrade(db, bob, u.id)).toBeNull();
    expect(await getOwnedServiceRecord(db, bob, r.id)).toBeNull();
    expect(await getOwnedTask(db, bob, t.id)).toBeNull();
    expect(await getOwnedTrip(db, bob, trip.id)).toBeNull();
    expect(await getOwnedQuote(db, bob, q.id)).toBeNull();
    expect(await getOwnedQuote(db, alice, q.id)).not.toBeNull();
  });

  it("serves private files only to their owner; public build profile photo only when opted in", async () => {
    const [f] = await db.insert(s.files).values({ ownerId: alice, mime: "image/png", sizeBytes: 4, filename: "a.png", data: Buffer.from("test") }).returning();
    await db.update(s.vehicles).set({ photoFileId: f.id }).where(eq(s.vehicles.id, aliceVehicle));
    expect(await getReadableFile(db, alice, f.id)).not.toBeNull();
    expect(await getReadableFile(db, bob, f.id)).toBeNull();
    expect(await getReadableFile(db, null, f.id)).toBeNull();

    // build profile public but photo NOT opted in → still private
    await db.insert(s.buildProfiles).values({ vehicleId: aliceVehicle, slug: "alice-build", title: "t", isPublic: true, showPhoto: false });
    expect(await getReadableFile(db, null, f.id)).toBeNull();
    // explicit opt-in → readable
    await db.update(s.buildProfiles).set({ showPhoto: true }).where(eq(s.buildProfiles.vehicleId, aliceVehicle));
    expect(await getReadableFile(db, null, f.id)).not.toBeNull();
    // private again
    await db.update(s.buildProfiles).set({ isPublic: false }).where(eq(s.buildProfiles.vehicleId, aliceVehicle));
    expect(await getReadableFile(db, bob, f.id)).toBeNull();
  });

  it("rejects malformed ids without querying", async () => {
    expect(await getOwnedVehicle(db, alice, "../../etc/passwd")).toBeNull();
    expect(await getReadableFile(db, alice, "not-a-uuid")).toBeNull();
  });

  it("does not list another user's attachments", async () => {
    const [f] = await db.insert(s.files).values({ ownerId: alice, mime: "application/pdf", sizeBytes: 4, filename: "r.pdf", data: Buffer.from("%PDF") }).returning();
    await db.insert(s.attachments).values({ userId: alice, vehicleId: aliceVehicle, entityType: "document", entityId: aliceVehicle, fileId: f.id, kind: "document" });
    expect((await listAttachments(db, alice, "document", aliceVehicle)).length).toBe(1);
    expect((await listAttachments(db, bob, "document", aliceVehicle)).length).toBe(0);
  });

  it("hashes passwords (no plaintext) and verifies them", async () => {
    const [u] = await db.select().from(s.users).where(eq(s.users.id, alice));
    expect(u.passwordHash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", u.passwordHash)).toBe(true);
    expect(await verifyPassword("wrong", u.passwordHash)).toBe(false);
  });

  it("cascades deletion of a user's vehicles and files", async () => {
    const temp = (await db.insert(s.users).values({ email: "temp@example.com", displayName: "t", passwordHash: "x" }).returning())[0].id;
    const v = await seedDemoGarage(db, temp);
    await db.delete(s.users).where(eq(s.users.id, temp));
    expect(await db.select().from(s.vehicles).where(eq(s.vehicles.id, v.id))).toHaveLength(0);
    expect(await db.select().from(s.mileageLogs).where(eq(s.mileageLogs.vehicleId, v.id))).toHaveLength(0);
  });
});

describe("seed data honesty", () => {
  it("keeps every demo trail flagged and published only as demo", async () => {
    const trails = await db.select().from(s.trails);
    expect(trails.length).toBeGreaterThan(0);
    for (const t of trails) {
      expect(t.isDemo).toBe(true);
      expect(t.nameHe).toMatch(/הדגמה/);
      expect(t.lastVerifiedAt).toBeNull();
    }
    expect(trails.some((t) => t.kind === "pin" && !t.geometry)).toBe(true);
  });

  it("gives real-brand catalogue items no fitment, no prices and no part numbers", async () => {
    const real = await db.select().from(s.parts).where(eq(s.parts.isDemo, false));
    expect(real.length).toBeGreaterThan(10);
    for (const p of real) {
      expect(p.partNumber).toBeNull();
      expect(await db.select().from(s.fitments).where(eq(s.fitments.partId, p.id))).toHaveLength(0);
      expect(await db.select().from(s.prices).where(eq(s.prices.partId, p.id))).toHaveLength(0);
      if (p.legalNote) expect(p.legalSourceUrl).toBeNull(); // unverified notes must not look sourced
    }
  });

  it("brands demo items as demo and keeps their fitment/prices flagged", async () => {
    const demo = await db.select().from(s.parts).where(eq(s.parts.isDemo, true));
    expect(demo.every((p) => p.brand === "פריט הדגמה" && p.nameHe.includes("הדגמה"))).toBe(true);
    const fits = await db.select().from(s.fitments);
    expect(fits.every((f) => f.isDemo)).toBe(true);
    const verified = fits.filter((f) => f.status === "verified");
    expect(verified.every((f) => f.evidence && f.verifiedAt)).toBe(true);
  });

  it("marks no catalogue spec as manufacturer-verified without a document", async () => {
    const specs = await db.select().from(s.variantSpecs);
    expect(specs.length).toBeGreaterThan(20);
    for (const sp of specs) {
      if (sp.source === "manufacturer_document") expect(sp.sourceRef && sp.verifiedAt).toBeTruthy();
      else expect(sp.verifiedAt).toBeNull();
    }
  });

  it("resolves seeded demo fitment per exact variant", async () => {
    const [rubicon] = await db.select().from(s.variants).where(eq(s.variants.slug, "jl-4dr-rubicon-20t"));
    const [sport] = await db.select().from(s.variants).where(eq(s.variants.slug, "jl-2dr-sport-20t"));
    const [jl4] = await db.select().from(s.variants).where(eq(s.variants.slug, "jl-4dr-sahara-20t"));
    const [lift] = await db.select().from(s.parts).where(and(eq(s.parts.isDemo, true), eq(s.parts.overlay, "lift")));
    const forVariant = async (variantId: string) => (await loadPartsWithFitment(db, { vehicle: { variantId, year: 2021 }, showDemo: true, partIds: [lift.id] }))[0].fit.status;
    expect(await forVariant(rubicon.id)).toBe("verified");
    expect(await forVariant(jl4.id)).toBe("owner_reported");
    expect(await forVariant(sport.id)).toBe("unconfirmed");
  });
});

describe("catalogue import validation", () => {
  it("rejects manufacturer-verified specs without a source document and date", async () => {
    await expect(
      importCatalogue(db, {
        version: 1,
        makes: [
          {
            slug: "testmake",
            nameEn: "T",
            nameHe: "ט",
            models: [
              {
                slug: "testmodel",
                nameEn: "M",
                nameHe: "מ",
                segment: "suv",
                generations: [
                  {
                    slug: "testgen",
                    code: "X",
                    name: "X",
                    yearFrom: 2020,
                    coverage: "basic",
                    variants: [{ slug: "testvar", name: "v", yearFrom: 2020, body: "suv-4door", archetype: "wagon", specs: [{ key: "wheelbase_mm", value: "1", source: "manufacturer_document", confidence: "high" }] }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow();
  });

  it("upserts idempotently by slug", async () => {
    const payload = {
      version: 1 as const,
      makes: [{ slug: "idem-make", nameEn: "I", nameHe: "א", models: [{ slug: "idem-model", nameEn: "M", nameHe: "מ", segment: "suv" as const, generations: [{ slug: "idem-gen", code: "G", name: "G", yearFrom: 2020, coverage: "listed" as const }] }] }],
    };
    await importCatalogue(db, payload);
    await importCatalogue(db, payload);
    expect(await db.select().from(s.generations).where(eq(s.generations.slug, "idem-gen"))).toHaveLength(1);
  });
});
