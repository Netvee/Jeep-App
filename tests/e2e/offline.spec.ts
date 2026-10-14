import { test, expect } from "@playwright/test";

test.skip(({ isMobile }) => !!isMobile, "service-worker behaviour is the same across viewports; run once");

test("saved vehicle summary and trail details are available offline", async ({ page, context }) => {
  // demo account gives a vehicle + demo trails quickly
  await page.goto("/");
  await page.getByRole("button", { name: "כניסה לחשבון הדגמה" }).first().click();
  await page.waitForURL("**/garage");
  // the service worker registers in production builds and precaches /offline
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.goto("/trails/demo-north-b");
  await page.getByRole("button", { name: "שמירה לשימוש ללא חיבור" }).click();
  await expect(page.getByText(/נשמרו לשימוש ללא חיבור/)).toBeVisible();
  await page.goto("/maintenance/checklists");
  await page.getByRole("button", { name: "שמירה לשימוש ללא חיבור" }).click();
  await expect(page.getByText("נשמר לשימוש ללא חיבור")).toBeVisible();

  await context.setOffline(true);
  await page.goto("/garage").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "זמין ללא חיבור" })).toBeVisible();
  await expect(page.getByText("הרנגלר (הדגמה)", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /מסלול הדגמה ב׳/ })).toBeVisible();
  await expect(page.getByText(/אריחי מפה/)).toBeVisible();
  await expect(page.getByRole("img", { name: /שרטוט קו המסלול/ })).toBeVisible();
  await context.setOffline(false);
});
