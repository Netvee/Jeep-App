import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const svg = readFileSync("public/icon.svg", "utf8");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [size, name, pad] of [[192, "icon-192.png", 0], [512, "icon-512.png", 0], [180, "apple-touch-icon.png", 0], [512, "icon-maskable-512.png", 60]]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<html><body style="margin:0;background:#1d1f21"><div style="padding:${pad}px;box-sizing:border-box;width:${size}px;height:${size}px">${svg.replace("<svg ", '<svg width="100%" height="100%" ')}</div></body></html>`);
  await p.screenshot({ path: "public/" + name, omitBackground: false });
  await p.close();
}
await b.close();
