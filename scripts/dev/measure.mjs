// Dev helper: demo-login, then measure server render time + background request count per page.
import { chromium } from "@playwright/test";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/");
await p.getByRole("button", { name: "כניסה לחשבון הדגמה" }).first().click();
await p.waitForURL("**/garage");
const paths = process.argv.slice(2);
for (const path of paths) {
  // server time: fetch HTML directly a few times
  const times = [];
  for (let i = 0; i < 3; i++) {
    const t = await p.evaluate(async (u) => { const s = performance.now(); const r = await fetch(u); await r.text(); return Math.round(performance.now() - s); }, path);
    times.push(t);
  }
  const reqs = [];
  const onReq = (r) => { if (r.url().includes("localhost:3000") && (r.headers()["rsc"] || r.headers()["next-router-prefetch"])) reqs.push(r.url()); };
  p.on("request", onReq);
  await p.goto("http://localhost:3000" + path);
  await p.waitForTimeout(2500);
  p.off("request", onReq);
  const html = await p.evaluate(() => document.documentElement.outerHTML.length);
  console.log(path.padEnd(28), "server ms:", times.join("/"), " bg RSC requests:", reqs.length, " html KB:", Math.round(html / 1024));
}
await b.close();
