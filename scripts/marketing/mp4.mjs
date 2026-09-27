import { chromium } from "playwright";
import fs from "node:fs";
// node mp4.mjs <framesSubdir> <count> <fps> <out.mp4>
const [,, sub, count, fps, out] = process.argv;
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("http://localhost:3470/encode.html");
await p.waitForFunction(() => window.ready);
const t = Date.now();
const r = await p.evaluate(([s, c, f]) => window.encode(s, Number(c), Number(f), "out.mp4"), [sub, count, fps]);
fs.writeFileSync(out, Buffer.from(r.b64, "base64"));
console.log(out, Math.round(fs.statSync(out).size / 1024), "KB in", Math.round((Date.now() - t) / 1000), "s");
await b.close();
