import fs from "node:fs";
import { PNG } from "pngjs";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
// node gif.mjs <framesDir> <fps> <out.gif>
const [,, dir, fps, out] = process.argv;
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
const frames = files.map((f) => PNG.sync.read(fs.readFileSync(`${dir}/${f}`)));
const { width, height } = frames[0];
// One palette for the whole loop, learned from every fourth frame: no flicker between frames.
const sample = frames.filter((_, i) => i % 4 === 0);
const joined = new Uint8Array(sample.length * width * height * 4);
sample.forEach((f, i) => joined.set(f.data, i * width * height * 4));
const palette = quantize(joined, 256, { format: "rgb565" });
const gif = GIFEncoder();
const delay = Math.round(1000 / Number(fps));
for (const f of frames) gif.writeFrame(applyPalette(f.data, palette, "rgb565"), width, height, { palette, delay, repeat: 0 });
gif.finish();
fs.writeFileSync(out, gif.bytes());
console.log(out, `${width}x${height}`, frames.length, "frames", Math.round(fs.statSync(out).size / 1024), "KB");
