import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";

const FIX = (f: string) => path.join(__dirname, "..", "fixtures", f);
const uid = () => Math.random().toString(36).slice(2, 10);

async function register(page: Page) {
  const email = `e2e-${uid()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("שם תצוגה").fill("בודק E2E");
  await page.getByLabel("אימייל").fill(email);
  await page.getByLabel("סיסמה").fill("a-long-test-password");
  await page.getByRole("button", { name: "יצירת חשבון" }).click();
  await page.waitForURL("**/onboarding");
  return email;
}

/** Adds a Jimny JB74 (catalogue variant) with a photo. */
async function onboardJimny(page: Page, withPhoto = true) {
  await page.getByLabel("חיפוש דגם").fill("ג'ימני");
  await page.getByRole("button", { name: /סוזוקי ג׳ימני.*JB74/ }).click();
  await page.getByRole("radio", { name: /3 דלתות · 1.5 · ידנית/ }).check();
  await page.getByLabel("כינוי (לא חובה)").fill("הג׳ימני של הבדיקה");
  await page.getByLabel("שנת ייצור").fill("2021");
  await page.getByLabel("מידת צמיג").fill("195/80R15");
  await page.getByLabel("קילומטראז׳ נוכחי").fill("52000");
  await page.getByLabel("הילוך כוח (Low)").selectOption("true");
  await page.getByLabel("מספר רישוי").fill("12-345-67");
  if (withPhoto) await page.getByLabel("תמונת רכב (לא חובה)").setInputFiles(FIX("vehicle.png"));
  await page.getByRole("button", { name: "הוספה לגראז׳" }).click();
  await page.waitForURL("**/garage**");
  await expect(page.getByRole("heading", { name: "הג׳ימני של הבדיקה" })).toBeVisible();
}

async function anonymousGet(browser: Browser, url: string) {
  const ctx = await browser.newContext();
  const res = await ctx.request.get(url);
  await ctx.close();
  return res.status();
}

test("vehicle onboarding with photo, persistence across reload and private photo access", async ({ page, browser, baseURL }) => {
  await register(page);
  await onboardJimny(page);
  const img = page.getByRole("img", { name: /תמונה של/ });
  await expect(img).toBeVisible();
  const src = await img.getAttribute("src");
  expect(src).toMatch(/^\/api\/files\//);
  // owner can fetch it, anonymous users get 404
  expect((await page.request.get(src!)).status()).toBe(200);
  expect(await anonymousGet(browser, `${baseURL}${src}`)).toBe(404);
  // reload: data persisted server-side
  await page.reload();
  await expect(page.getByRole("heading", { name: "הג׳ימני של הבדיקה" })).toBeVisible();
  await expect(page.getByText("52,000 ק״מ").first()).toBeVisible();
  // registration plate never appears on the garage page
  await expect(page.getByText("12-345-67")).toHaveCount(0);
});

test("installed upgrade shows in the component panel of the illustration", async ({ page }) => {
  await register(page);
  await onboardJimny(page, false);
  await page.goto("/upgrades/new?status=installed");
  await page.getByLabel("שם השדרוג").fill("מגני ספים מותאמים");
  await page.getByLabel("רכיב ברכב").selectOption("rock_sliders");
  await page.getByLabel("תאריך התקנה").fill("2026-05-01");
  await page.getByLabel("ק״מ בהתקנה").fill("50000");
  await page.getByRole("button", { name: "שמירה" }).click();
  await page.waitForURL("**/upgrades/**");
  await page.goto("/garage");
  const hotspot = page.getByRole("button", { name: /מגני ספים — יש שדרוג מותקן/ }).first();
  await hotspot.scrollIntoViewIfNeeded();
  await hotspot.click();
  const panel = page.getByRole("complementary", { name: /פרטי רכיב: מגני ספים/ });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "מגני ספים מותאמים" })).toBeVisible();
  await expect(panel.getByText(/50,000 ק״מ/)).toBeVisible();
  // system filter + view switch work
  await page.getByRole("tab", { name: "גחון" }).click();
  await page.getByRole("button", { name: "מיגון" }).click();
  await expect(page.getByRole("button", { name: /מגני גחון/ }).first()).toBeVisible();
});

test("planned upgrade: variant fitment, explicit unknown costs and total", async ({ page }) => {
  await register(page);
  await onboardJimny(page, false);
  await page.goto("/upgrades/catalog");
  await page.getByLabel("חיפוש חלקים").fill("שנורקל");
  await page.getByRole("link", { name: /שנורקל \(פריט הדגמה\)/ }).click();
  await expect(page.getByText("התאמה מאומתת").first()).toBeVisible();
  await page.getByRole("button", { name: "הוספה לתוכנית" }).click();
  await page.waitForURL("**/upgrades/*?added=1");
  // part price copied from catalogue; other kinds unknown → not counted as zero
  await expect(page.getByText(/\+ רכיבים לא ידועים/).first()).toBeVisible();
  // labour: amount; supporting + shipping: not applicable
  const labour = page.locator("div.rounded-xl", { has: page.getByText("עבודה/התקנה", { exact: true }) }).first();
  await labour.getByText("עריכה").click();
  await labour.getByText("סכום", { exact: true }).click();
  await labour.getByLabel("מ- (₪)").fill("800");
  await labour.getByLabel("עד (₪)").fill("800");
  await labour.getByRole("button", { name: "שמירה" }).click();
  await expect(page.getByText("העלות נשמרה")).toBeVisible();
  for (const kind of ["חלקים נלווים", "משלוח/יבוא"]) {
    const row = page.locator("div.rounded-xl", { has: page.getByText(kind, { exact: true }) }).first();
    await row.getByText("עריכה").click();
    await row.getByText("לא רלוונטי", { exact: true }).click();
    await row.getByRole("button", { name: "שמירה" }).click();
    await expect(row.getByText("לא רלוונטי (0 ₪)", { exact: true })).toBeVisible();
  }
  await expect(page.getByText(/2,000–2,700/).first()).toBeVisible();
  await expect(page.getByText(/\+ רכיבים לא ידועים/)).toHaveCount(0);
  // planner page shows the same total
  await page.goto("/upgrades");
  await expect(page.getByText(/2,000–2,700/).first()).toBeVisible();
  // a documented-incompatible item for this variant is hidden by default
  await page.goto("/upgrades/catalog");
  await expect(page.getByRole("link", { name: /ערכת הגבהה 2.5/ })).toHaveCount(0);
});

test("service record completes a reminder and recomputes the next due date/km", async ({ page }) => {
  await register(page);
  await onboardJimny(page, false);
  await page.goto("/maintenance?add=1");
  await page.getByLabel("מה לבצע").first().fill("החלפת שמן מנוע");
  await page.getByLabel("כל X ק״מ").first().fill("10000");
  await page.getByLabel("כל X חודשים").first().fill("12");
  await page.getByLabel("בוצע לאחרונה (תאריך)").first().fill("2025-01-01");
  await page.getByLabel("בוצע לאחרונה (ק״מ)").first().fill("40000");
  await page.getByRole("button", { name: "הוספת תזכורת" }).click();
  await expect(page.getByText("התזכורת נוספה")).toBeVisible();
  await page.reload();
  const overdue = page.locator("section", { has: page.getByRole("heading", { name: /באיחור/ }) });
  await expect(overdue.getByText("החלפת שמן מנוע")).toBeVisible();
  // log the service
  await page.goto("/maintenance/new");
  await page.getByLabel("כותרת").fill("טיפול 52,000");
  await page.getByLabel("ק״מ בטיפול").fill("52000");
  await page.getByLabel("החלפת שמן מנוע").check();
  await page.getByLabel("עלות (₪)").fill("950");
  await page.getByRole("button", { name: "שמירת טיפול" }).click();
  await page.waitForURL("**/maintenance?saved=1**");
  const later = page.locator("section", { has: page.getByRole("heading", { name: /בהמשך/ }) });
  await expect(later.getByText("החלפת שמן מנוע")).toBeVisible();
  await expect(later.getByText(/62,000 ק״מ/)).toBeVisible();
  await page.goto("/maintenance/history?show=service");
  await expect(page.getByText("טיפול 52,000")).toBeVisible();
});

test("trails: filter, open a route, inspect an obstacle, GPX validation and export", async ({ page }) => {
  await register(page);
  await onboardJimny(page, false);
  await page.goto("/trails");
  await page.getByLabel("אזור").selectOption("south");
  const list = page.getByRole("link", { name: /מסלול הדגמה/ });
  await expect(list).toHaveCount(2);
  await page.getByRole("link", { name: /מסלול הדגמה ד׳/ }).click();
  await expect(page.getByText("מסלול הדגמה").first()).toBeVisible();
  await expect(page.getByText(/הקואורדינטות סינתטיות/).first()).toBeVisible();
  // obstacle marker on the map → popup with category and community/verified label
  await page.locator(".leaflet-marker-icon").first().click();
  await expect(page.locator(".leaflet-popup-content")).toContainText(/דיווח קהילה|מאומת/);
  // vehicle match explains missing data rather than guessing
  await expect(page.getByText(/חסר מידע:/)).toBeVisible();
  // GPX export of the demo route is labelled as demo
  const gpx = await page.request.get("/api/trails/demo-south-d/gpx");
  expect(gpx.status()).toBe(200);
  expect(await gpx.text()).toContain("DEMO");
  // GPX import validation
  await page.goto("/trails/gpx");
  await page.getByLabel(/בחירת קובץ GPX/).setInputFiles(FIX("evil.gpx"));
  await expect(page.getByText("הקובץ נדחה")).toBeVisible();
  await page.getByLabel(/בחירת קובץ GPX/).setInputFiles(FIX("route.gpx"));
  await expect(page.getByText(/1 מסלולים/)).toBeVisible();
});

test("save a trip, share it read-only, and export the mechanic report", async ({ page, browser, baseURL }) => {
  await register(page);
  await onboardJimny(page, false);
  await page.goto("/trips/new?trail=demo-north-b");
  await page.getByLabel("שם הטיול").fill("טיול בדיקה לגליל");
  await page.getByLabel("תאריך").fill("2026-11-20");
  await page.getByLabel("תיאור").fill("חניון המפגש");
  await page.getByLabel("קו רוחב (lat)").fill("32.9");
  await page.getByLabel("קו אורך (lng)").fill("35.3");
  await page.getByText("חציית מים").click();
  await page.getByRole("button", { name: "יצירת טיול" }).click();
  await page.waitForURL(/\/trips\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "טיול בדיקה לגליל" })).toBeVisible();
  // condition-specific post-trip check is present
  await expect(page.getByText(/מים בשמן דיפרנציאלים/)).toBeVisible();
  // share explicitly
  await page.getByRole("button", { name: "יצירת קישור שיתוף" }).click();
  const link = await page.getByRole("textbox", { name: "העתקת קישור" }).inputValue();
  expect(link).toContain("/share/trip/");
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(link.replace(/^https?:\/\/[^/]+/, baseURL!));
  await expect(ap.getByRole("heading", { name: "טיול בדיקה לגליל" })).toBeVisible();
  await expect(ap.getByText("12-345-67")).toHaveCount(0);
  await anon.close();
  // mechanic report
  await page.goto("/report");
  const report = page.locator("article");
  await expect(report.getByRole("heading", { name: "הג׳ימני של הבדיקה" })).toBeVisible();
  await expect(report.getByText("12-345-67")).toHaveCount(0); // plate excluded by default
  await page.getByLabel("מספר רישוי (פרטי)").check();
  await page.getByLabel("שאלות למכונאי").fill("האם יש חופש בהיגוי?");
  await page.getByRole("button", { name: "עדכון הדוח" }).click();
  await expect(report.getByText("12-345-67")).toBeVisible();
  await expect(report.getByText("האם יש חופש בהיגוי?")).toBeVisible();
  await expect(page.getByRole("button", { name: /הדפסה \/ שמירה כ-PDF/ })).toBeVisible();
});

test("another user cannot reach private records over HTTP", async ({ page, browser, baseURL }) => {
  await register(page);
  await onboardJimny(page, false);
  const editHref = await page.getByRole("link", { name: "עריכת פרופיל" }).getAttribute("href");
  const ctx = await browser.newContext({ baseURL });
  const other = await ctx.newPage();
  await register(other);
  // the page streams behind a loading boundary, so the status is 200 – what matters is that nothing leaks
  await other.goto(editHref!);
  await expect(other.getByRole("heading", { name: "הדף לא נמצא" })).toBeVisible();
  await expect(other.getByText("הג׳ימני של הבדיקה")).toHaveCount(0);
  const backup = await other.request.get("/api/export");
  const json = await backup.json();
  expect(JSON.stringify(json)).not.toContain("הג׳ימני של הבדיקה");
  await ctx.close();
});
