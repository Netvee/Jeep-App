/**
 * Data model for "שטח" — personal garage, upgrade planner and off-road companion.
 *
 * Conventions
 * - Every user-owned table carries `userId` (directly, or via `vehicleId` → vehicles.userId).
 *   All reads/writes for private data go through src/server/* helpers that scope by user.
 * - Nullable columns mean "unknown". The UI shows "לא ידוע" rather than inventing values.
 * - Provenance: catalogue/price/fitment/trail rows carry source + verification date +
 *   confidence/status. `isDemo` rows are clearly labelled demo data and never mixed
 *   silently with verified data.
 * - Money is stored in agorot-free whole shekels (integer ILS) — sufficient for planning.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  doublePrecision,
  customType,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType() {
    return "bytea";
  },
  fromDriver(value) {
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
  },
});

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ users */

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  isDemoAccount: boolean("is_demo_account").notNull().default(false),
  /** Preferences: pressure unit, show demo data, budget etc. */
  prefs: jsonb("prefs").$type<UserPrefs>().notNull().default({}),
  createdAt: createdAt(),
});

export type UserPrefs = {
  pressureUnit?: "psi" | "bar";
  showDemoData?: boolean;
  activeVehicleId?: string;
};

export const sessions = pgTable(
  "sessions",
  {
    /** sha256 of the random session token — the raw token only lives in the cookie. */
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------- files */

/** Uploaded files are stored in Postgres and only served after an ownership check. */
export const files = pgTable(
  "files",
  {
    id: id(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
    /** public files (catalogue reference images uploaded by admins, approved report photos) */
    isPublic: boolean("is_public").notNull().default(false),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    filename: text("filename").notNull(),
    data: bytea("data").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("files_owner_idx").on(t.ownerId)],
);

/* ------------------------------------------------------ vehicle catalogue */

export type ProvenanceSource =
  | "manufacturer_document" // verified against a cited manufacturer document
  | "editorial" // compiled by editors from public manufacturer material, pending document check
  | "owner_reported"
  | "importer"; // Israeli importer publication

export const makes = pgTable("makes", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameHe: text("name_he").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  createdAt: createdAt(),
});

export const models = pgTable("models", {
  id: id(),
  makeId: uuid("make_id")
    .notNull()
    .references(() => makes.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameHe: text("name_he").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  segment: text("segment", { enum: ["suv", "pickup", "compact"] }).notNull(),
  createdAt: createdAt(),
});

export const generations = pgTable("generations", {
  id: id(),
  modelId: uuid("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  code: text("code").notNull(), // e.g. JL, J150, JB74
  name: text("name").notNull(),
  yearFrom: integer("year_from").notNull(),
  yearTo: integer("year_to"), // null = still in production
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  /** listed: generation only · basic: variants with key specs · deep: + components & fitment */
  coverage: text("coverage", { enum: ["listed", "basic", "deep"] }).notNull().default("listed"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type BodyStyle = "suv-2door" | "suv-4door" | "pickup-double" | "pickup-single" | "pickup-extended";
export type Archetype = "boxy-short" | "boxy-long" | "wagon" | "pickup" | "compact-boxy";

export const variants = pgTable(
  "variants",
  {
    id: id(),
    generationId: uuid("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(), // e.g. "Rubicon 4 דלתות 2.0T"
    trim: text("trim"),
    yearFrom: integer("year_from").notNull(),
    yearTo: integer("year_to"),
    body: text("body").$type<BodyStyle>().notNull(),
    engine: text("engine"),
    fuel: text("fuel", { enum: ["petrol", "diesel", "hybrid", "phev", "electric"] }),
    transmission: text("transmission"),
    drivetrain: text("drivetrain"),
    /** Illustration archetype + proportions for the generic SVG */
    archetype: text("archetype").$type<Archetype>().notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("variants_generation_idx").on(t.generationId)],
);

/** One row per specification value, each with its own provenance. */
export const variantSpecs = pgTable(
  "variant_specs",
  {
    id: id(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // e.g. wheelbase_mm, factory_tyre, front_axle
    value: text("value").notNull(),
    unit: text("unit"),
    source: text("source").$type<ProvenanceSource>().notNull(),
    sourceRef: text("source_ref"), // document title / URL
    confidence: text("confidence", { enum: ["high", "medium", "low"] }).notNull(),
    verifiedAt: date("verified_at"),
    createdAt: createdAt(),
  },
  (t) => [index("variant_specs_variant_idx").on(t.variantId)],
);

export const referenceImages = pgTable("reference_images", {
  id: id(),
  generationId: uuid("generation_id").references(() => generations.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => variants.id, { onDelete: "cascade" }),
  url: text("url"),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  license: text("license").notNull(),
  attribution: text("attribution").notNull(),
  sourceUrl: text("source_url"),
  createdAt: createdAt(),
});

/** Official service schedule entries — only from cited manufacturer documentation. */
export const officialServiceItems = pgTable("official_service_items", {
  id: id(),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => variants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  intervalKm: integer("interval_km"),
  intervalMonths: integer("interval_months"),
  severeUseNote: text("severe_use_note"),
  sourceDocument: text("source_document").notNull(),
  sourcePage: text("source_page"),
  verifiedAt: date("verified_at").notNull(),
  createdAt: createdAt(),
});

/* -------------------------------------------------------------- vehicles */

export type IntendedUse =
  | "daily"
  | "light_trails"
  | "desert_sand"
  | "rocky"
  | "overlanding"
  | "towing"
  | "mud";

export const vehicles = pgTable(
  "vehicles",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => variants.id, { onDelete: "set null" }),
    nickname: text("nickname"),
    // free-text fallbacks/overrides (owner-reported); null = unknown
    make: text("make"),
    model: text("model"),
    generation: text("generation"),
    year: integer("year"),
    trim: text("trim"),
    engine: text("engine"),
    transmission: text("transmission"),
    drivetrain: text("drivetrain"),
    body: text("body").$type<BodyStyle>(),
    wheelbaseMm: integer("wheelbase_mm"),
    tyreSize: text("tyre_size"),
    wheelSpec: text("wheel_spec"),
    suspension: text("suspension"),
    liftCm: doublePrecision("lift_cm"),
    /** owner-reported capability facts used for trail matching; null = unknown */
    groundClearanceCm: doublePrecision("ground_clearance_cm"),
    hasLowRange: boolean("has_low_range"),
    lockers: text("lockers", { enum: ["none", "rear", "front_rear", "center_only"] }),
    tyreType: text("tyre_type", { enum: ["road", "at", "mt"] }),
    intendedUse: jsonb("intended_use").$type<IntendedUse[]>().notNull().default([]),
    driverExperience: text("driver_experience", { enum: ["beginner", "intermediate", "advanced"] }),
    // private by default — never exposed in public build profiles or shares
    registrationPlate: text("registration_plate"),
    vin: text("vin"),
    purchaseDate: date("purchase_date"),
    ownershipNotes: text("ownership_notes"),
    photoFileId: uuid("photo_file_id").references(() => files.id, { onDelete: "set null" }),
    budgetIls: integer("budget_ils"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("vehicles_user_idx").on(t.userId)],
);

export const mileageLogs = pgTable(
  "mileage_logs",
  {
    id: id(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    km: integer("km").notNull(),
    recordedOn: date("recorded_on").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("mileage_vehicle_idx").on(t.vehicleId)],
);

/** Generic attachment link: photos, receipts, documents, audio recordings. */
export const attachments = pgTable(
  "attachments",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
    entityType: text("entity_type", {
      enum: ["vehicle", "upgrade", "service", "symptom", "quote", "document"],
    }).notNull(),
    entityId: uuid("entity_id"),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["photo", "receipt", "document", "audio", "video"] }).notNull(),
    title: text("title"),
    createdAt: createdAt(),
  },
  (t) => [index("attachments_entity_idx").on(t.entityType, t.entityId), index("attachments_vehicle_idx").on(t.vehicleId)],
);

/* ------------------------------------------------- parts & compatibility */

export type PartCategory =
  | "suspension"
  | "tyres"
  | "wheels"
  | "protection"
  | "recovery"
  | "winch"
  | "drivetrain"
  | "compressor"
  | "lighting"
  | "electrical"
  | "storage"
  | "camping"
  | "cooling"
  | "engine"
  | "brakes";

export const suppliers = pgTable("suppliers", {
  id: id(),
  name: text("name").notNull(),
  url: text("url"),
  city: text("city"),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: date("verified_at"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const parts = pgTable("parts", {
  id: id(),
  category: text("category").$type<PartCategory>().notNull(),
  /** component key in the vehicle illustration taxonomy (src/lib/components.ts) */
  componentKey: text("component_key").notNull(),
  brand: text("brand").notNull(),
  nameHe: text("name_he").notNull(),
  nameEn: text("name_en"),
  partNumber: text("part_number"), // null = not verified
  description: text("description"),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  benefits: jsonb("benefits").$type<string[]>().notNull().default([]),
  tradeoffs: jsonb("tradeoffs").$type<string[]>().notNull().default([]),
  maintenanceNotes: jsonb("maintenance_notes").$type<string[]>().notNull().default([]),
  requiredSupporting: jsonb("required_supporting").$type<string[]>().notNull().default([]),
  /** keys of other components this part may conflict with or depend on */
  conflictsWith: jsonb("conflicts_with").$type<string[]>().notNull().default([]),
  installComplexity: integer("install_complexity"), // 1 (simple) … 5 (major); null unknown
  proInstallRecommended: boolean("pro_install_recommended"),
  /** Optional illustration overlay (e.g. "winch", "roofrack", "lift") */
  overlay: text("overlay"),
  liftCm: doublePrecision("lift_cm"),
  tyreSize: text("tyre_size"),
  // Regulatory/insurance/warranty: only sourced notes with dates
  legalNote: text("legal_note"),
  legalSourceUrl: text("legal_source_url"),
  legalCheckedAt: date("legal_checked_at"),
  imageFileId: uuid("image_file_id").references(() => files.id, { onDelete: "set null" }),
  imageCredit: text("image_credit"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type FitmentStatus = "verified" | "owner_reported" | "unconfirmed" | "incompatible";

/** Fitment is always per *variant* — a matching model name is never enough. */
export const fitments = pgTable(
  "fitments",
  {
    id: id(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    status: text("status").$type<FitmentStatus>().notNull(),
    evidence: text("evidence"),
    sourceUrl: text("source_url"),
    verifiedAt: date("verified_at"),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("fitments_part_variant_uq").on(t.partId, t.variantId)],
);

export const prices = pgTable(
  "prices",
  {
    id: id(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["supplier", "owner_reported", "estimate"] }).notNull(),
    amountMin: integer("amount_min").notNull(),
    amountMax: integer("amount_max"),
    currency: text("currency").notNull().default("ILS"),
    includesVat: boolean("includes_vat"), // null = unknown
    availability: text("availability"),
    sourceUrl: text("source_url"),
    observedAt: date("observed_at").notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("prices_part_idx").on(t.partId)],
);

/* ------------------------------------------------ user upgrades (plan) */

export type UpgradeStatus = "wishlist" | "planned" | "quoted" | "purchased" | "installed" | "removed";
export type UpgradePhase = "essential" | "protection" | "capability" | "comfort";

export const vehicleUpgrades = pgTable(
  "vehicle_upgrades",
  {
    id: id(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    partId: uuid("part_id").references(() => parts.id, { onDelete: "set null" }),
    customName: text("custom_name"),
    componentKey: text("component_key").notNull(),
    status: text("status").$type<UpgradeStatus>().notNull(),
    phase: text("phase").$type<UpgradePhase>(),
    priority: integer("priority").notNull().default(3), // 1 high … 5 low
    /** group of alternatives being compared (same group = alternatives) */
    alternativeGroup: text("alternative_group"),
    reason: text("reason"),
    installedOn: date("installed_on"),
    installedKm: integer("installed_km"),
    installedBy: text("installed_by"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("upgrades_vehicle_idx").on(t.vehicleId)],
);

export type CostKind = "part" | "labour" | "supporting" | "shipping";
export type CostSource = "supplier" | "owner" | "estimate" | "quote" | "receipt";

/**
 * Explicit cost lines. A missing kind for an upgrade = UNKNOWN (never zero).
 * `notApplicable` lines explicitly record "no cost of this kind" (e.g. self-install labour).
 */
export const upgradeCosts = pgTable(
  "upgrade_costs",
  {
    id: id(),
    upgradeId: uuid("upgrade_id")
      .notNull()
      .references(() => vehicleUpgrades.id, { onDelete: "cascade" }),
    kind: text("kind").$type<CostKind>().notNull(),
    notApplicable: boolean("not_applicable").notNull().default(false),
    amountMin: integer("amount_min"),
    amountMax: integer("amount_max"),
    includesVat: boolean("includes_vat"),
    source: text("source").$type<CostSource>().notNull(),
    note: text("note"),
    recordedOn: date("recorded_on").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("upgrade_costs_kind_uq").on(t.upgradeId, t.kind)],
);

/* ----------------------------------------------------------- workshops */

export const workshops = pgTable("workshops", {
  id: id(),
  name: text("name").notNull(),
  region: text("region", { enum: ["north", "center", "south", "judea_samaria"] }).notNull(),
  city: text("city"),
  specialties: jsonb("specialties").$type<string[]>().notNull().default([]),
  phone: text("phone"),
  website: text("website"),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: date("verified_at"),
  sponsored: boolean("sponsored").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  /** user-added private workshop (only visible to its creator) */
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type QuoteItem = { description: string; amount: number | null; kind?: CostKind };

export const quotes = pgTable(
  "quotes",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
    upgradeId: uuid("upgrade_id").references(() => vehicleUpgrades.id, { onDelete: "set null" }),
    workshopId: uuid("workshop_id").references(() => workshops.id, { onDelete: "set null" }),
    workshopName: text("workshop_name"),
    title: text("title").notNull(),
    quotedOn: date("quoted_on").notNull(),
    validUntil: date("valid_until"),
    items: jsonb("items").$type<QuoteItem[]>().notNull().default([]),
    includesVat: boolean("includes_vat"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("quotes_user_idx").on(t.userId)],
);

/* --------------------------------------------------------- maintenance */

export const serviceRecords = pgTable(
  "service_records",
  {
    id: id(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    performedOn: date("performed_on").notNull(),
    km: integer("km"),
    workshopId: uuid("workshop_id").references(() => workshops.id, { onDelete: "set null" }),
    workshopName: text("workshop_name"),
    title: text("title").notNull(),
    workPerformed: text("work_performed"),
    partsUsed: text("parts_used"),
    costIls: integer("cost_ils"),
    includesVat: boolean("includes_vat"),
    notes: text("notes"),
    /** reminder tasks this service completed */
    completedTaskIds: jsonb("completed_task_ids").$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("service_vehicle_idx").on(t.vehicleId)],
);

/**
 * Reminders. `kind` keeps sources apart:
 *  - official: copied from a cited manufacturer schedule (officialServiceItems)
 *  - user: owner-defined
 *  - suggestion: general inspection suggestion (not a manufacturer interval)
 */
export const maintenanceTasks = pgTable(
  "maintenance_tasks",
  {
    id: id(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["official", "user", "suggestion"] }).notNull(),
    intervalKm: integer("interval_km"),
    intervalMonths: integer("interval_months"),
    /** one-off due date/km (non-recurring) */
    dueOn: date("due_on"),
    dueKm: integer("due_km"),
    lastDoneOn: date("last_done_on"),
    lastDoneKm: integer("last_done_km"),
    sourceRef: text("source_ref"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("tasks_vehicle_idx").on(t.vehicleId)],
);

/* ---------------------------------------------------- troubleshooting */

export const symptomLogs = pgTable(
  "symptom_logs",
  {
    id: id(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
    description: text("description"),
    urgency: text("urgency", { enum: ["observe", "workshop", "stop"] }).notNull(),
    resolved: boolean("resolved").notNull().default(false),
    occurredOn: date("occurred_on").notNull(),
    km: integer("km"),
    createdAt: createdAt(),
  },
  (t) => [index("symptoms_vehicle_idx").on(t.vehicleId)],
);

/* -------------------------------------------------------------- trails */

export type Region = "north" | "center" | "south" | "judea_samaria";
export type LngLat = [number, number];

export type AccessNote = {
  type: "nature_reserve" | "firing_zone" | "private_land" | "temporary" | "seasonal" | "other";
  description: string;
  sourceUrl?: string;
  verifiedAt?: string;
  authority?: string;
};

export type TrailRequirements = {
  minGroundClearanceCm?: number;
  lowRange?: boolean;
  tyres?: "road" | "at" | "mt";
  lockersRecommended?: boolean;
  recoveryGearRecommended?: boolean;
};

export const trails = pgTable("trails", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nameHe: text("name_he").notNull(),
  nameEn: text("name_en"),
  region: text("region").$type<Region>().notNull(),
  /** route = full line geometry; pin = location only, NOT a navigable route */
  kind: text("kind", { enum: ["route", "pin"] }).notNull(),
  description: text("description"),
  /** GeoJSON-style [lng, lat] (+ optional elevation) coordinates for routes */
  geometry: jsonb("geometry").$type<number[][]>(),
  startPoint: jsonb("start_point").$type<LngLat>().notNull(),
  endPoint: jsonb("end_point").$type<LngLat>(),
  distanceKm: doublePrecision("distance_km"),
  durationMin: integer("duration_min"),
  elevationGainM: integer("elevation_gain_m"),
  elevationMinM: integer("elevation_min_m"),
  elevationMaxM: integer("elevation_max_m"),
  surfaces: jsonb("surfaces").$type<string[]>().notNull().default([]),
  difficulty: integer("difficulty"), // 1–5 using DIFFICULTY_RUBRIC; null = unrated
  seasonality: text("seasonality"),
  obstaclesSummary: text("obstacles_summary"),
  requirements: jsonb("requirements").$type<TrailRequirements>().notNull().default({}),
  suggestedEquipment: jsonb("suggested_equipment").$type<string[]>().notNull().default([]),
  driverExperience: text("driver_experience", { enum: ["beginner", "intermediate", "advanced"] }),
  receptionNotes: text("reception_notes"),
  exitPoints: text("exit_points"),
  access: jsonb("access").$type<AccessNote[]>().notNull().default([]),
  advisories: text("advisories"),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url"),
  license: text("license"),
  lastVerifiedAt: date("last_verified_at"),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type ObstacleCategory =
  | "rock_step"
  | "boulders"
  | "ruts"
  | "sand"
  | "mud"
  | "steep"
  | "off_camber"
  | "water"
  | "locked_gate"
  | "closure"
  | "damage"
  | "other";

export const trailReports = pgTable(
  "trail_reports",
  {
    id: id(),
    trailId: uuid("trail_id").references(() => trails.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    category: text("category").$type<ObstacleCategory>().notNull(),
    description: text("description").notNull(),
    photoFileId: uuid("photo_file_id").references(() => files.id, { onDelete: "set null" }),
    observedOn: date("observed_on").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected", "duplicate"] })
      .notNull()
      .default("pending"),
    /** verified by an admin against an authoritative source (e.g. official closure) */
    verified: boolean("verified").notNull().default(false),
    verificationSource: text("verification_source"),
    duplicateOf: uuid("duplicate_of"),
    moderationNote: text("moderation_note"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("reports_trail_idx").on(t.trailId)],
);

export const savedTrails = pgTable(
  "saved_trails",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trailId: uuid("trail_id")
      .notNull()
      .references(() => trails.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.trailId] })],
);

/* --------------------------------------------------------------- trips */

export type TripTask = { id: string; title: string; phase: "pre" | "post"; done: boolean };

export const trips = pgTable(
  "trips",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    trailId: uuid("trail_id").references(() => trails.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    tripDate: date("trip_date"),
    meetingPointLabel: text("meeting_point_label"),
    meetingLat: doublePrecision("meeting_lat"),
    meetingLng: doublePrecision("meeting_lng"),
    meetingTime: text("meeting_time"),
    notes: text("notes"),
    conditions: jsonb("conditions").$type<string[]>().notNull().default([]), // dust, mud, water, sand, rocks
    tasks: jsonb("tasks").$type<TripTask[]>().notNull().default([]),
    status: text("status", { enum: ["planned", "completed", "cancelled"] }).notNull().default("planned"),
    /** random token for explicit read-only sharing; null = not shared */
    shareToken: text("share_token").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("trips_user_idx").on(t.userId)],
);

/* ----------------------------------------------------------- community */

export const communityPosts = pgTable(
  "community_posts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    generationId: uuid("generation_id").references(() => generations.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => variants.id, { onDelete: "set null" }),
    kind: text("kind", {
      enum: ["upgrade_experience", "install_cost", "reliability", "workshop_review"],
    }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    partId: uuid("part_id").references(() => parts.id, { onDelete: "set null" }),
    workshopId: uuid("workshop_id").references(() => workshops.id, { onDelete: "set null" }),
    costIls: integer("cost_ils"),
    rating: integer("rating"),
    status: text("status", { enum: ["published", "hidden"] }).notNull().default("published"),
    createdAt: createdAt(),
  },
  (t) => [index("posts_generation_idx").on(t.generationId)],
);

/** Opt-in public build profile. Only whitelisted fields are ever rendered publicly. */
export const buildProfiles = pgTable("build_profiles", {
  vehicleId: uuid("vehicle_id")
    .primaryKey()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  isPublic: boolean("is_public").notNull().default(false),
  title: text("title").notNull(),
  summary: text("summary"),
  showPhoto: boolean("show_photo").notNull().default(false),
  showCosts: boolean("show_costs").notNull().default(false),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------- audit */

export const adminAudit = pgTable("admin_audit", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  detail: jsonb("detail"),
  createdAt: createdAt(),
});

