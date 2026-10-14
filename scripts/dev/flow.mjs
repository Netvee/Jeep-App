// Dev helper: log in as demo and screenshot given paths. Usage: node flow.mjs outdir path1 path2 ...
import { chromium } from "@playwright/test";
const [,, outDir, ...paths] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [label, vp] of (process.env.PHONE ? [["phone", { width: 390, height: 844 }]] : [["desktop", { width: 1366, height: 900 }]])) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  p.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
  await p.goto("http://localhost:3000/");
  await p.getByRole("button", { name: "כניסה לחשבון הדגמה" }).first().click();
  await p.waitForURL("**/garage", { timeout: 60000 });
  for (const path of paths) {
    const r = await p.goto("http://localhost:3000" + path);
    await p.waitForTimeout(1500);
    const name = `${outDir}/${label}${path.replace(/[/?=&]/g, "_")}.png`;
    await p.screenshot({ path: name, fullPage: true });
    console.log(label, path, r.status(), name);
  }
  await ctx.close();
}
await b.close();
