import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { PHOTO_SETS, photoSetFor } from "@/components/vehicle/photo-sets";
import { catalogueSeed } from "@/db/seed/catalogue-data";

describe("vehicle photo sets", () => {
  const gens = new Set(catalogueSeed.makes.flatMap((mk) => (mk.models ?? []).flatMap((md) => (md.generations ?? []).map((g) => g.slug))));

  it("every set is keyed by a catalogue generation and ships all four images", () => {
    for (const [slug, set] of Object.entries(PHOTO_SETS)) {
      expect(gens.has(slug), slug).toBe(true);
      for (const v of Object.values(set.views)) expect(existsSync(`public${v.src}`), v.src).toBe(true);
    }
  });

  it("every underbody view can be tapped for skid plates", () => {
    for (const [slug, set] of Object.entries(PHOTO_SETS)) expect(set.views.under.zones.some((z) => z[0] === "skid_plates"), slug).toBe(true);
  });

  it.each([
    ["Toyota", "Land Cruiser Prado", 2015, "toyota-prado-j150"],
    ["טויוטה", "לנד קרוזר פראדו", 2006, "toyota-prado-j120"],
    ["Toyota", "Land Cruiser 250", 2024, "toyota-prado-j250"],
    ["Toyota", "Land Cruiser", 2016, "toyota-lc-j200"],
    ["Toyota", "Land Cruiser", 2023, "toyota-lc-j300"],
    ["Toyota", "Land Cruiser 79", 2015, "toyota-lc-70"],
    ["Toyota", "Hilux", 2012, "toyota-hilux-an10"],
    ["Toyota", "Hilux", 2019, "toyota-hilux-an120"],
    ["Suzuki", "Jimny", 2012, "suzuki-jimny-jb43"],
    ["Suzuki", "Jimny", 2021, "suzuki-jimny-jb74"],
    ["Jeep", "Wrangler", 2015, null],
  ])("%s %s %i → %s", (make, model, year, expected) => {
    expect(photoSetFor({ make, model, year })).toBe(expected);
  });
});
