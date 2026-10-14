import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { vehicleCapability, loadVisibleReports, duplicateCounts } from "@/server/trails";
import { matchTrail, REGION_LABEL, DIFFICULTY_RUBRIC, ACCESS_LABEL, AUTHORITY_LINKS, VERDICT_LABEL, OBSTACLE_LABEL, STALE_REPORT_DAYS, EXPERIENCE_LABEL } from "@/lib/trails";
import { formatDate, formatNumber } from "@/lib/units";
import { Card, CardHeader, PageHeader, Badge, DemoBadge, Notice, ExternalLink, DefList, LinkButton, buttonClass } from "@/components/ui";
import { toggleSaveTrailAction } from "@/app/actions/trails";
import { TrailInteractive } from "./interactive";
import type { OfflineTrail } from "@/lib/offline-pack";

export const metadata: Metadata = { title: "מסלול" };

const VERDICT_TONE = { suitable: "olive", caution: "warn", not_recommended: "danger", insufficient_info: "info" } as const;

export default async function TrailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db, user, active, showDemo } = await getGarage();
  const [t] = await db.select().from(s.trails).where(and(eq(s.trails.slug, slug), eq(s.trails.status, "published")));
  if (!t) notFound();
  const [cap, reports, [saved]] = await Promise.all([
    vehicleCapability(db, active),
    loadVisibleReports(db, [t.id], user.id, showDemo || t.isDemo),
    db.select().from(s.savedTrails).where(and(eq(s.savedTrails.userId, user.id), eq(s.savedTrails.trailId, t.id))),
  ]);
  const dups = await duplicateCounts(db, reports.map((r) => r.id));
  const match = cap ? matchTrail({ difficulty: t.difficulty, requirements: t.requirements, driverExperience: t.driverExperience }, cap) : null;
  const rubric = DIFFICULTY_RUBRIC.find((d) => d.level === t.difficulty);
  const facts: [string, string][] = [
    ["אזור", REGION_LABEL[t.region]],
    ["סוג", t.kind === "route" ? "מסלול עם קו מלא" : "נקודת מיקום בלבד — לא מסלול ניווט"],
    ["אורך", t.distanceKm != null ? `${formatNumber(t.distanceKm, 1)} ק״מ` : "לא ידוע"],
    ["משך משוער", t.durationMin != null ? `כ-${formatNumber(t.durationMin / 60, 1)} שעות` : "לא ידוע"],
    ["טיפוס מצטבר", t.elevationGainM != null ? `${t.elevationGainM} מ׳` : "לא ידוע"],
    ["גובה", t.elevationMinM != null ? `${t.elevationMinM}–${t.elevationMaxM} מ׳` : "לא ידוע"],
    ["משטח", t.surfaces.join(", ") || "לא ידוע"],
    ["עונתיות", t.seasonality ?? "לא ידוע"],
    ["ניסיון נהג", t.driverExperience ? EXPERIENCE_LABEL[t.driverExperience] : "לא צוין"],
    ["קליטה סלולרית", t.receptionNotes ?? "אין מידע ממקור"],
    ["יציאות וגישת חילוץ", t.exitPoints ?? "לא ידוע"],
  ];
  const offline: OfflineTrail = {
    slug: t.slug,
    name: t.nameHe,
    isDemo: t.isDemo,
    kind: t.kind,
    region: REGION_LABEL[t.region],
    geometry: t.geometry,
    start: t.startPoint,
    facts: [...facts, ["קושי", t.difficulty ? `${t.difficulty}/5 ${rubric?.label ?? ""}` : "לא דורג"], ["מכשולים", t.obstaclesSummary ?? "—"], ["ציוד מומלץ", t.suggestedEquipment.join(", ") || "—"]],
    access: t.access.map((a) => `${ACCESS_LABEL[a.type]}: ${a.description}`),
    reports: reports.filter((r) => r.status === "approved").map((r) => ({ category: OBSTACLE_LABEL[r.category], description: r.description, observedOn: r.observedOn, lat: r.lat, lng: r.lng })),
    source: `${t.sourceName}${t.lastVerifiedAt ? ` · אומת ${t.lastVerifiedAt}` : " · ללא תאריך אימות"}`,
    savedAt: "",
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href="/trails" className="hover:underline">
            מסלולים · {REGION_LABEL[t.region]}
          </Link>
        }
        title={t.nameHe}
        actions={
          <div className="flex flex-wrap gap-2">
            <form action={toggleSaveTrailAction}>
              <input type="hidden" name="trailId" value={t.id} />
              <button className={buttonClass(saved ? "secondary" : "primary")}>{saved ? "הסרה מהשמורים" : "שמירת מסלול"}</button>
            </form>
            <LinkButton href={`/trips/new?trail=${t.slug}`} variant="secondary">
              תכנון טיול
            </LinkButton>
            {t.kind === "route" && (
              <a href={`/api/trails/${t.slug}/gpx`} className={buttonClass("ghost")} download>
                ייצוא GPX
              </a>
            )}
          </div>
        }
      />
      {t.isDemo && (
        <Notice tone="warn" title="מסלול הדגמה">
          <DemoBadge className="me-2" />
          הקואורדינטות סינתטיות ואינן מתארות דרך אמיתית. אין לנווט לפיו ואין להסיק ממנו דבר על זכויות גישה, מכשולים או עבירות.
        </Notice>
      )}
      {t.kind === "pin" && <Notice tone="info">זוהי נקודת מיקום בלבד — לא מסלול עם קו. אין בה מידע על דרך הגישה.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
        <div className="flex flex-col gap-6">
          <TrailInteractive
            trail={{ id: t.id, slug: t.slug, name: t.nameHe, kind: t.kind, isDemo: t.isDemo, geometry: t.geometry, start: t.startPoint, difficulty: t.difficulty }}
            reports={reports.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, category: r.category, description: r.description, observedOn: r.observedOn, status: r.status, verified: r.verified, isDemo: r.isDemo, ageDays: r.ageDays }))}
            offline={offline}
          />
          {t.description && (
            <Card className="p-5">
              <p className="text-[15px]">{t.description}</p>
            </Card>
          )}
          <Card>
            <CardHeader title="נתוני המסלול" />
            <div className="p-5 pt-3">
              <DefList rows={facts} />
            </div>
          </Card>
          <Card>
            <CardHeader title="מכשולים וציוד" />
            <div className="p-5 pt-3 text-sm flex flex-col gap-2">
              <p>{t.obstaclesSummary ?? "לא תועדו מכשולים ממקור. היעדר מידע אינו מעיד שאין מכשולים."}</p>
              {t.suggestedEquipment.length > 0 && <p>ציוד מומלץ: {t.suggestedEquipment.join(", ")}</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="דיווחי שטח" subtitle="דיווחי קהילה נבדקים לפני פרסום. דיווח ישן מסומן." />
            <div className="p-5 pt-3">
              {reports.length ? (
                <ul className="flex flex-col gap-2">
                  {reports
                    .sort((a, b) => a.ageDays - b.ageDays)
                    .map((r) => (
                      <li key={r.id} className="rounded-xl border border-sand-200 px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{OBSTACLE_LABEL[r.category]}</span>
                          {r.verified ? <Badge tone="danger">הגבלה מאומתת</Badge> : <Badge tone="info">דיווח קהילה</Badge>}
                          {r.status === "pending" && <Badge>ממתין לאישור (נראה רק לכם)</Badge>}
                          {r.ageDays > STALE_REPORT_DAYS && <Badge tone="warn">ישן — ייתכן שאינו עדכני</Badge>}
                          {r.isDemo && <DemoBadge />}
                          {(dups.get(r.id) ?? 0) > 0 && <Badge tone="olive">אושר ע״י עוד {dups.get(r.id)}</Badge>}
                        </div>
                        <p className="mt-1">{r.description}</p>
                        <p className="text-xs text-charcoal-500 mt-1">
                          נצפה {formatDate(r.observedOn)} · לפני {r.ageDays} ימים
                          {r.verificationSource && ` · מקור אימות: ${r.verificationSource}`}
                        </p>
                        {r.photoFileId && r.status === "approved" && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/files/${r.photoFileId}`} alt="תמונת הדיווח" className="mt-2 rounded-lg max-h-48" loading="lazy" />
                        )}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal-500">אין דיווחים. היעדר דיווחים אינו מעיד שהדרך פתוחה או עבירה.</p>
              )}
            </div>
          </Card>
          <p className="text-xs text-charcoal-500">
            מקור: {t.sourceName}
            {t.sourceUrl && (
              <>
                {" "}
                · <ExternalLink href={t.sourceUrl}>קישור</ExternalLink>
              </>
            )}
            {t.license && ` · רישיון: ${t.license}`} · אימות אחרון: {t.lastVerifiedAt ? formatDate(t.lastVerifiedAt) : "לא אומת"}
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader title="קושי" as="h3" />
            <div className="p-5 pt-3 text-sm">
              {rubric ? (
                <>
                  <p className="text-2xl font-bold">
                    {rubric.level}/5 <span className="text-base font-medium">{rubric.label}</span>
                  </p>
                  <p className="mt-1">{rubric.description}</p>
                  <p className="text-charcoal-600 mt-1">{rubric.vehicle}</p>
                </>
              ) : (
                <p>המסלול טרם דורג.</p>
              )}
              <Link href="/trails/rubric" className="text-olive-700 hover:underline text-xs">
                איך מדרגים? ←
              </Link>
            </div>
          </Card>
          <Card>
            <CardHeader title={active ? `התאמה ל${vehicleDisplayName(active)}` : "התאמה לרכב"} as="h3" />
            <div className="p-5 pt-3 text-sm flex flex-col gap-3">
              {match ? (
                <>
                  <Badge tone={VERDICT_TONE[match.verdict]} className="self-start text-sm">
                    {VERDICT_LABEL[match.verdict]}
                  </Badge>
                  <ul className="flex flex-col gap-2">
                    {match.checks.map((c) => (
                      <li key={c.label} className="flex gap-2">
                        {c.state === "met" ? <CheckCircle2 size={18} className="text-olive-600 shrink-0" /> : c.state === "unmet" ? <XCircle size={18} className="text-danger-700 shrink-0" /> : <CircleHelp size={18} className="text-charcoal-400 shrink-0" />}
                        <span>
                          <span className="font-medium">{c.label}: </span>
                          {c.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {match.missing.length > 0 && (
                    <p className="text-xs text-warn-700">
                      חסר מידע: {match.missing.join(", ")}.{" "}
                      {active && (
                        <Link href={`/garage/${active.id}/edit`} className="underline">
                          השלמה בפרופיל
                        </Link>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-charcoal-500">ההתאמה משווה דרישות מוצהרות לנתונים שהוזנו. היא אינה מבטיחה מעבר בטוח — תנאי השטח משתנים.</p>
                </>
              ) : (
                <p>הוסיפו רכב כדי לראות התאמה.</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="גישה והגבלות" as="h3" />
            <div className="p-5 pt-3 text-sm flex flex-col gap-3">
              {t.access.length ? (
                t.access.map((a, i) => (
                  <div key={i} className="rounded-lg bg-warn-100/60 p-3">
                    <p className="font-semibold">{ACCESS_LABEL[a.type]}</p>
                    <p>{a.description}</p>
                    <p className="text-xs mt-1">
                      {a.authority && `גורם: ${a.authority} · `}
                      {a.sourceUrl ? <ExternalLink href={a.sourceUrl}>מקור</ExternalLink> : "ללא מקור"} · {a.verifiedAt ? `אומת ${formatDate(a.verifiedAt)}` : "לא אומת"}
                    </p>
                  </div>
                ))
              ) : (
                <p>אין במערכת מידע על הגבלות גישה למסלול זה — זה אינו אומר שאין כאלה.</p>
              )}
              {t.advisories && <p className="font-medium">{t.advisories}</p>}
              <div>
                <p className="text-xs text-charcoal-600 mb-1">בדקו מול הגורמים המוסמכים לפני יציאה:</p>
                <ul className="text-xs flex flex-col gap-1">
                  {AUTHORITY_LINKS.map((l) => (
                    <li key={l.url}>
                      <ExternalLink href={l.url}>{l.name}</ExternalLink> — {l.topic}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
