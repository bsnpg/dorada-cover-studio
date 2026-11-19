# Dorada Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bsnpg/dorada-cover-studio/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bsnpg/dorada-cover-studio/reward.svg)](https://make.fun/c/gta6-cover-art-01)

**Dorada Cover Studio — GTA 6-style multi-panel poster maker.** Turn a photo
and a caption into cover art in the style of GTA 6's posters, and export it
as a PNG to share. Built for the
[Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01) bounty on
make.fun.

The world is original: **Isla Dorada**, a sun-baked island city of pastel
streets, neon boardwalks and fast cars. No Rockstar Games logo, wordmark,
official artwork, character or font is used anywhere — the lettering is set
in Anton, Oswald and Yellowtail, the art is your own photos or the ten
procedurally generated sample photos shipped with the app.

## What it does

- **Five layouts** — Hero Left (big hero + 4 small panels), Hero Top, Duo
  Split, Grid 3×3, Full-Bleed Single. One click switches the whole poster.
- **Seven grades** — Sunset, Neon Night, Golden Hour, Noir, Teal Heat,
  Bubblegum, and Poster Ink: a posterized print look with a halftone dot
  grid in a sunset orange → magenta → deep plum palette. A **Poster Ink
  overlay** checkbox + intensity slider lays the halftone over any grade.
  The ink touches the photo panels only; the title band, script, tagline,
  badges and HEAT stars are always drawn crisp on top.
- **Any photo** — upload a photo per panel, drag to pan, scroll to zoom,
  per-panel grade override, per-panel sample picker. One photo can fill
  every panel, or each panel can have its own. Photos are read on your own
  machine and never leave it.
- **Caption editing** — big condensed title with auto-fit, neon script
  subhead, tagline, kicker badge, NEW and EST. 2026 stickers, HEAT stars.
- **Fast** — "Use sample set" fills every panel at once, "Randomize" rolls
  a whole new poster, and three export buttons write the PNG in one click:
  Square 1080×1080, Portrait 1080×1350, Landscape 1920×1080. The live
  preview and the export are the same canvas drawing at different sizes,
  so what you see is what you get.

## Run it

The app is plain static files under `app/` — no build step, no network.
Serve it and open it in desktop Chrome:

```sh
node main.ts --serve --port 8080
# open http://127.0.0.1:8080/
```

`node main.ts` (no arguments) hands the entry in instead: it copies
`app/` and `screenshots/` to `MAKEFUN_OUTPUT_DIR` (or `/output`) and
writes `dossier.json` there.

## How it is built

- `app/index.html` — the editor page.
- `app/style.css` — the dark editor theme.
- `app/src/cover.js` — the cover renderer: layouts, grades, halftone,
  title band, skyline, badges. Everything is drawn on canvas.
- `app/src/editor.js` — the sidebar controls, pan/zoom/drop, exports.
- `app/src/shots.js` — the `?shot=` scenes the four screenshots were taken from.
- `app/src/main.js` — boot: fonts, samples, editor.
- `app/samples/` — ten sample photos, generated procedurally with canvas
  art during the build (no external images).
- `app/fonts/` — Anton (SIL OFL), Oswald (SIL OFL), Yellowtail
  (Apache License 2.0 — see `LICENSE-Yellowtail.txt` in that directory).
- `main.ts` — the entrypoint: handoff (default) or dev server (`--serve`).
- `vendor/makefun-app.ts` — make.fun's dossier library, unchanged from the kit.

## Screenshots

1. `1-cover.jpg` — exported landscape cover, "DORADA HEAT", Poster Ink.
2. `2-editor.jpg` — the editor, photo loaded, Poster Ink + overlay on.
3. `3-cover.jpg` — exported portrait cover, "NEON TIDES", Neon Night.
4. `4-cover.jpg` — exported square cover, "GOLDEN HOUR RUN", Golden Hour.

## License

MIT — see [LICENSE](LICENSE).
