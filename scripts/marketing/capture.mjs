import { chromium } from "playwright";
import fs from "node:fs";
// node capture.mjs <fmt> <lang> <fps> <fromMs> <toMs> <scale> <jpg|png> <dir>
const [,, fmt, lang, fps, from, to, scale, kind, dir] = process.argv;
const size = { vertical: [720, 1280], square: [720, 720], wide: [1280, 720] }[fmt].map((n) => Math.round(n * Number(scale)));
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: size[0], height: size[1] } });
await p.goto(`http://localhost:3458/tour/index.html?record=1&f=${fmt}&lang=${lang}&scale=${scale}`);
await p.evaluate(() => document.fonts.ready);
const step = 1000 / Number(fps);
let i = 0;
for (let t = Number(from); t < Number(to); t += step, i++) {
  await p.evaluate((t) => window.renderAt(t), t);
  await p.screenshot({ path: `${dir}/${String(i).padStart(4, "0")}.${kind}`, type: kind === "jpg" ? "jpeg" : "png", ...(kind === "jpg" ? { quality: 92 } : {}) });
}
console.log(dir, i, "frames", size.join("x"));
await b.close();
