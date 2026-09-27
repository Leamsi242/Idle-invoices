#!/usr/bin/env bash
# Regenerates the promo videos, GIFs and gallery screenshots from the animated tour (public/tour).
# Needs the app running on http://localhost:3458 (BANK_DEMO=1 for the gallery) and, in this folder:
#   npm i playwright @ffmpeg/ffmpeg@0.12.15 @ffmpeg/util@0.12.2 @ffmpeg/core@0.12.10 gifenc@1.0.3 pngjs@7.0.0
#   node serve.mjs &   (serves the encoder page and ffmpeg.wasm on :3470)
set -e
cd "$(dirname "$0")"
mkdir -p frames out
for lang in fr en; do
  for fmt in vertical square wide; do
    node capture.mjs $fmt $lang 25 0 24000 1.5 jpg frames/$fmt-$lang
    node mp4.mjs $fmt-$lang 600 25 out/subscription-detective-$fmt-$lang.mp4
  done
  node capture.mjs square $lang 10 0 3400 0.3334 png frames/t-$lang && node gif.mjs frames/t-$lang 10 out/gif-vignette-240-$lang.gif
  node capture.mjs square $lang 10 3400 11600 0.6667 png frames/a-$lang && node gif.mjs frames/a-$lang 10 out/gif-analyse-480-$lang.gif
  node capture.mjs square $lang 10 11600 20000 0.6667 png frames/d-$lang && node gif.mjs frames/d-$lang 10 out/gif-decision-480-$lang.gif
  node capture.mjs wide $lang 8 0 24000 0.5 png frames/w-$lang && node gif.mjs frames/w-$lang 8 out/gif-visite-640x360-$lang.gif
done
node gallery.mjs
rm -rf frames
