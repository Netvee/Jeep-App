# שטח · Shetach — personal garage & off-road companion for 4×4 owners in Israel

A Hebrew-first (RTL) progressive web app: manage your vehicles, see installed and planned modifications on an interactive vehicle illustration, plan upgrades with honest Israeli-shekel costs, keep maintenance history and reminders, triage symptoms, explore trails on a map, plan trips and export a mechanic-ready report.

**Honesty rules built into the product:** unknown values stay *unknown* (never silently zero), fitment is only "verified" with documented evidence for the exact catalogue variant, demo records are always labelled **הדגמה** (including on the map), and nothing is presented as navigation, diagnosis or a safety guarantee.

---

## Get a public web address (Render, one click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Netvee/Jeep-App)

Sign in to Render with GitHub → **Apply**. Render creates the web service and a Postgres database from `render.yaml`, builds the app (≈5–10 minutes) and gives you an `https://shetach-….onrender.com` address that works on any phone, tablet or computer. Free-tier notes: the service sleeps after ~15 minutes idle (the next visit takes ~1 minute to wake up), and Render's free Postgres has a limited lifetime — upgrade the database plan to keep data long-term.

## Try it in the browser (GitHub Codespaces)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Netvee/Jeep-App?ref=claude/shetach-4x4-garage)

Click the button → **Create codespace**. GitHub installs and builds the app (≈3–5 minutes the first time), then starts it automatically on port 3000 — no editor needs to be open. Open the **Ports** tab and click the globe icon next to port 3000 (or the "Open in browser" pop-up), then press **כניסה לחשבון הדגמה** for the demo account. If the app isn't running, open a terminal and run `bash .devcontainer/start.sh` (log: `/tmp/shetach.log`). The link is private to your GitHub account unless you set the port to Public. Data lives in the codespace's embedded database.

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000 — embedded Postgres (PGlite) in ./.data/pglite, auto-migrated + seeded
```

Open the app and either register, or press **כניסה לחשבון הדגמה** for a throw-away account with a sample (fake, labelled) garage.

Make yourself an admin (stop the dev server first when using the embedded DB — PGlite is single-process):

```bash
npm run make-admin -- you@example.com     # or set ADMIN_EMAILS=you@example.com before registering/logging in
```

### Production

```bash
DATABASE_URL=postgres://… npm run build && DATABASE_URL=postgres://… npm start
```

Migrations (`./drizzle`) run automatically on first request; the reference catalogue is seeded once (admin edits are never overwritten). Serve over **HTTPS** (session cookies are `Secure` in production).

### Environment variables (`.env.example`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Supabase Postgres, Neon, RDS, self-hosted). Empty → embedded PGlite (local/demo only, single process). |
| `PGLITE_DIR` | Optional directory for the embedded DB (default `./.data/pglite`). |
| `ADMIN_EMAILS` | Comma-separated emails granted the admin role on register/login. |
| `SEED_DEMO_DATA` | `true` (default) seeds labelled demo trails/parts/prices/workshops; `false` for a clean production catalogue. |
| `REGISTER_RATE_LIMIT` | Max registrations per client IP per 10 minutes (default 10; the e2e server raises it). |
| `NEXT_PUBLIC_TILE_URL`, `NEXT_PUBLIC_TILE_ATTRIBUTION` | Raster tile provider. Default: OpenStreetMap standard tiles (light interactive use only under the OSMF Tile Usage Policy). Use a commercial/self-hosted provider for production traffic. |

No other external credentials are required. There is **no AI backend, no OBD-II integration and no payment/email service** in this release.

### Scripts

| Command | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck`, `npm run lint` | TypeScript, ESLint |
| `npm test` | Vitest: unit + integration (integration runs real Postgres via in-memory PGlite) |
| `npm run build && npm run test:e2e` | Playwright on desktop, phone (390×844) and iPad (820×1180) against a production build with an isolated DB |
| `npm run db:generate` | Generate a SQL migration after editing `src/db/schema.ts` |
| `npm run db:seed` | Migrate + seed explicitly |

---

## What works (end-to-end, persisted)

**My Garage** — multiple vehicles, active-vehicle switcher, onboarding via bilingual catalogue search (make → model → generation → year range → variant) or manual entry; every field may be left unknown. Dated mileage log (manual only — no implied auto-sync; stale readings flagged), photo upload (EXIF/GPS stripped from JPEG/PNG), documents/receipts/photos/recordings with owner-only access, ownership notes, budget. Registration plate/VIN/documents are private and excluded from shares, public profiles and reports by default.

**Interactive vehicle illustration** — parametric SVG (boxy short/long, compact, wagon, pickup) scaled by wheelbase, tyre diameter and lift; side / front / rear / underbody views; pan, pinch/ctrl-wheel zoom, keyboard (+/−/arrows); system filters (suspension, tyres & wheels, brakes, drivetrain, engine & cooling, electrical, recovery, protection, storage); installed-upgrade toggles; planned-upgrade preview (dashed orange) and side-by-side comparison. Each component opens a panel: purpose, factory configuration with provenance badge, installed parts (date/km/installer, link to photos & receipts), planned items, compatible candidates with fitment status and price label, and general inspection suggestions (one tap → reminder). Clearly labelled as a generic, approximate illustration that does not simulate clearance or geometry.

**Per-generation illustrations** — the Jeep Wrangler JL, Jeep Gladiator JT, Jeep Grand Cherokee WL, Land Rover Defender L663 and Classic, Mercedes G-Class W463, Mitsubishi Triton 6, L200 KL and Pajero V80/V90, Ford Ranger P703, Ford Bronco U725 and Isuzu D-Max RG use owner-supplied illustrations (`public/vehicles/<generation-slug>/`, defined in `src/components/vehicle/photo-sets.ts` with hand-placed tap zones per view). They appear in the viewer (with an „איור / שרטוט” toggle back to the parametric drawing, which still shows lift, tyre size and upgrade overlays), the garage header, the catalogue page and the landing page. To add another generation, drop four transparent images (side, front, rear, under) into `public/vehicles/<generation-slug>/` and add an entry with zones.

**Upgrades & planner** — searchable catalogue (Hebrew/English/aliases: כננת/winch, מגביה/lift, KO2…), per-variant fitment (Verified / Owner-reported / Unconfirmed / Incompatible) with evidence and dates, price records (supplier / owner-reported / estimate, VAT status, date, source). Planner with phases (essential, protection & recovery, capability, comfort), priorities, alternative groups + comparison table, dependency/conflict checks (winch without bumper, locker without compressor, much larger tyres without lift, documented incompatibility), recommendations driven by intended use and existing config (incl. "training/maintenance first"), budget bar that never claims "within budget" while costs are unknown, cost lines per kind (part, labour, supporting, shipping) with explicit *unknown* vs *not applicable*, quotes (itemised, VAT, validity, file) that can update cost lines, mark purchased/installed → transferred into the vehicle record with date & mileage (optionally updating lift/tyre size).

**Maintenance** — date + km reminders ("whichever first"), overdue/soon/unknown grouping, owner-defined recurring and one-off tasks, separation of *official* intervals (only from a cited manufacturer document entered by admins), *owner-defined* and *general suggestions*; service records (workshop, work, parts, cost, VAT, receipt) that complete linked reminders; timeline (services, installs, mileage, symptoms, trips); pre/post-trip checklists driven by conditions (dust, mud, water, sand, rocks, night, remote) and installed equipment.

**Troubleshooting** — structured triage (warning lights, noises/vibration, leaks/smells/smoke, starting, overheating, behaviour) with follow-up questions → *observe / workshop / stop safely* plus owner-safe checks and possible explanations, explicitly not a diagnosis; photo/recording attachments stored for the mechanic (never analysed); symptom journal. OBD-II is documented as not supported.

**Trails** — Leaflet map + list, region (north/center/south/Judea & Samaria), difficulty, route-vs-pin, saved and "requirements met" filters; trail page with stats, explained 1–5 rubric, vehicle match (met/unmet/unknown + missing info, never a guarantee), access restrictions with authority links and verification state, community reports with stale (>45 days), pending and verified-restriction states; on-map obstacle reporting (location must be near the route, optional photo) with duplicate detection (same category within 150 m / 30 days → counted as confirmation) and admin moderation; "my location" with copy (never stored). GPX import (server-validated: size, DOCTYPE/ENTITY rejection, coordinate validation, point limits) and GPX export (demo routes exported as DEMO).

**Trips** — trip plans with trail, date, meeting point (+ coordinates), condition-based pre/post checklists, completion with odometer, push unfinished post-trip checks into maintenance reminders, explicit read-only share link (revocable; shows only whitelisted fields).

**Offline** — service worker (production) precaches `/offline` and its assets; navigations fall back to it when offline. The device keeps an offline pack in localStorage: vehicle summary (auto-saved on garage visits), saved checklists, saved trail details with a basemap-free route sketch. Map tiles are **not** downloaded (OSM tile policy). The offline page lists exactly what is stored; logout clears it.

**Workshops & reports** — directory with region/specialty filters, verified/unverified and **sponsored** labels, private workshops, owner reviews (real users only); quote comparison grouped per upgrade (cheapest *complete* quote highlighted, partial quotes flagged). Mechanic report: owner selects sections (spec with provenance, mileage, mods, history, open reminders, symptoms, photos, optional plate/VIN, questions) → print / **Save as PDF** via the browser (correct Hebrew shaping). Nothing is ever sent to a workshop automatically.

**Community** — posts by vehicle generation (upgrade experiences, real installation costs, reliability, workshop reviews). No seeded/fake users or reviews; demo accounts cannot post. Opt-in public build profiles (`/builds/<slug>`) show only make/model/year, installed upgrade names and — if opted in — photo and costs.

**Settings & data** — display name, PSI/bar preference, demo-data toggle, PSI↔bar converter, tyre-size comparison (diameter cm/inch, axle-height change, speedometer effect — nominal), full JSON backup export, account deletion (password + typed confirmation).

**Admin** (`/admin`, role-gated) — catalogue JSON import (validated, idempotent upsert by slug), per-spec provenance editing (manufacturer-document requires source + date), licensed reference images, official service intervals (document + date required); parts CRUD, per-variant fitment with evidence rules, prices with source/date/VAT, suppliers (verified needs date); trail GPX import → draft (source + licence mandatory) → metadata/requirements/access-restrictions JSON → publish (real routes need licence + verification date); report moderation (approve, reject, mark duplicate, verify as official restriction with source); community moderation; public workshops (verified/sponsored); freshness review (prices > 90 days, fitment > 1 year, unverified trails, workshop verification) and an audit log.

---

## Demo data (always labelled "הדגמה")

Seeded when `SEED_DEMO_DATA` is not `false`, flagged `is_demo` in the DB:

- **6 demo routes + 1 demo pin** across all four regions. **Geometry is synthetic** (generated), does not follow any real road and must not be used for navigation; names are generic ("מסלול הדגמה א׳…"). Access notes on them only illustrate how restrictions are displayed.
- **10 demo parts** (brand "פריט הדגמה") with demo fitment of every status and demo price estimates — to demonstrate fitment and costing. They are not real products.
- **3 fictional demo workshops** (one marked sponsored to show the label), 6 demo trail reports.
- **Demo accounts** get a sample Wrangler with fake history; a persistent banner says so.

## Data sources & coverage

- **Vehicle catalogue:** 9 makes, 19 models, 31 generations, 25 variants (deep: Wrangler JL, Prado J150, Hilux AN120/130, Jimny JB74; basic: Wrangler JK, Gladiator JT, Grand Cherokee WK2, LC200, Pajero V80/90, L200, Patrol Y62, Defender L663; others listed only). Specs (wheelbase, suspension layout, etc.) were compiled editorially from public manufacturer material and are **all marked "עריכה — טרם אומת"** with medium confidence and no verification date. None is presented as manufacturer-verified. Israeli market availability per variant is not asserted.
- **Reference images:** none shipped (no licensed source was available in the build environment). Generic illustrations are shown and labelled; admins can add images only with licence + attribution.
- **Upgrade catalogue:** 18 real product lines / generic part types (BFGoodrich KO2/KM3, WARN VR EVO 10-S, ARB Air Locker & compressor, OME, Mopar JL 2″ lift, MAXTRAX, Front Runner, Safari, Optima, Rigid, Dometic, generic sliders/skid plates/recovery gear/radiator) **without part numbers, fitment or prices** — every vehicle sees "לא אומת" and "מחיר לא ידוע" until evidence is entered. Regulatory notes on lifts/tyres/lights/bumpers are explicitly marked unverified; no Israeli regulatory guidance was invented.
- **Official service schedules:** none (no manufacturer document was available). The UI says so and asks owners to use their service booklet.
- **Trails:** **no real trail data is included.** No licensed Israeli 4×4 route source was reachable from the build environment, so the ingestion + review workflow (GPX import with mandatory source/licence, draft → publish, freshness tracking) is built and only demo routes are shown. Candidate sources to evaluate (licence permitting): OpenStreetMap-derived tracks (ODbL — attribution & share-alike), official open data from public bodies, or partnerships with route authors.
- **Workshops & suppliers:** none real; directory/admin workflow ready.
- **Authority links:** homepages of רשות הטבע והגנים, קק״ל and צה״ל only — specific restrictions must be checked there.

## Architecture

- **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS 4**, server components + server actions; `cacheComponents` is off (almost everything is per-user).
- **Postgres via Drizzle ORM**; same schema/migrations on node-postgres (production) and PGlite (zero-setup local/demo and tests).
- **Auth:** email + password (scrypt), random session tokens stored hashed in `sessions`, httpOnly SameSite=Lax cookies, basic rate limiting. Supabase *Postgres* works as `DATABASE_URL`; Supabase Auth/Storage are not used (avoids external credentials).
- **Authorization:** every private query goes through owner-scoped helpers in `src/server/repo.ts`; files are served by `/api/files/[id]` only to the owner (or when explicitly public); 404 for everything else.
- **Uploads:** stored in Postgres (`bytea`), type detected by magic bytes, 10 MB limit, EXIF stripped, served with `nosniff` + sandboxed CSP.
- **Maps:** Leaflet/react-leaflet, lazy-loaded; illustration viewer lazy-loaded.
- **Key domain logic (unit-tested):** `src/lib/{fitment,costs,reminders,gpx,search,units,trails,triage,checklists,plan-checks}.ts`.

```
src/app/(app)/…      authenticated pages (garage, upgrades, maintenance, trails, trips, report, admin…)
src/app/actions/…    server actions (all validate input and re-check ownership)
src/app/api/…        files, GPX validate/export, JSON backup
src/components/vehicle/  geometry.ts · drawing.tsx · viewer.tsx
src/db/              schema.ts · client.ts · seed/ (catalogue, real parts, demo)
src/server/          auth, repo (owner scoping), catalog/fitment loading, summaries
tests/unit|integration|e2e
```

### Extension points (not implemented as fake features)

- **Detailed 3D:** `VehicleSvg`/`hotspots` are keyed by the shared component taxonomy (`src/lib/components.ts`); a 3D viewer (e.g. glTF via three.js) can reuse the same component keys and panel data once licensed per-variant models exist.
- **OBD-II:** symptom logs already store structured data; a provider would plug in behind a supported adapter (e.g. Web Bluetooth BLE ELM327 on Chromium/Android). The UI states it is not supported today.
- **AI assistant:** triage is rule-based; a server-side model with grounded reference material could enrich explanations (keep keys server-side).

## Verification

- `npm test` — 90 tests: fitment per exact variant (no sibling inheritance, evidence/date required, year-range downgrade), incomplete price totals (unknown ≠ 0, N/A, VAT uncertainty, budget states), date/km reminders (earliest wins, unknown mileage, stale readings, completion), GPX validation (XXE/DOCTYPE, malformed, coordinates, limits, export round-trip), bilingual search, tyre/pressure units, trail matching, triage red flags, upload sniffing/EXIF stripping, plan dependency checks; integration on real Postgres: cross-user authorization for vehicles/upgrades/records/tasks/trips/quotes/files/attachments, public-photo opt-in, cascade deletion, seed honesty (demo flags, no fake fitment/prices/verification), catalogue import validation & idempotency.
- `npm run test:e2e` — on desktop, phone and iPad viewports: onboarding with photo + reload persistence + private photo access; installed upgrade visible in the component panel; planned upgrade with verified (demo) fitment, explicit unknown → complete total; service record completing a reminder and recomputing next due km; trail filter → route → obstacle popup, GPX reject/accept, demo GPX export; trip + read-only share + mechanic report options; cross-user HTTP access returns 404; offline page with saved vehicle/trail after going offline.

## Known limitations & next priorities

1. **Real data:** source and license Israeli trail data; verify specs against manufacturer documents; add real suppliers/prices and fitment evidence; licensed reference photos.
2. Uploads live in Postgres — fine for a first release; move large media to object storage (S3/Supabase Storage) with signed URLs at scale.
3. The embedded PGlite mode is single-process (dev/demo only). Use `DATABASE_URL` for any shared deployment.
4. Rate limiting is in-memory per process and keys on `X-Forwarded-For` — deploy behind a proxy that sets it (otherwise it can be spoofed) and use a shared store (Redis) for multiple instances. No email verification / password reset yet (needs an email provider).
5. Offline maps: integrate a tile provider whose licence allows offline packs (or self-hosted vector tiles) before offering tile downloads.
6. PDF is produced by the browser's print dialog; a server-rendered PDF would need a bundled Hebrew font and bidi shaping.
7. Community moderation is admin-only (no user flagging yet); no notifications for reminders (push/email) yet.
8. Next: richer vehicle archetypes and per-generation illustrations, 3D where licensed assets exist, OBD-II via a supported adapter, workshop booking requests (explicit send only).
