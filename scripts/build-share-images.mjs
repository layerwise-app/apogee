#!/usr/bin/env node
/**
 * Draws the 1200×630 share images in public/og/ from the `share` text in
 * src/content/pages.ts, using the site's colors, fonts, logo, and globe.
 *
 *   pnpm build:share-images
 *
 * Uses headless Chrome through Playwright (installed as a dev dependency).
 * Rerun after changing page share text, colors, fonts, or the logo.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { pages } = await import(pathToFileURL(join(root, 'src/content/pages.ts')).href);
const { siteConfig } = await import(pathToFileURL(join(root, 'src/site.config.ts')).href);
const { constellation } = await import(pathToFileURL(join(root, 'src/content/constellation.ts')).href);

const dataUrl = async (path, type) =>
  `data:${type};base64,${(await readFile(join(root, 'public', path))).toString('base64')}`;

const c = siteConfig.colors;
const display = siteConfig.fonts.display;
const mono = siteConfig.fonts.mono.find((m) => m.weight === '500') ?? siteConfig.fonts.mono[0];
const [displayFont, monoFont, globe, logo] = await Promise.all([
  dataUrl(display.file, 'font/woff2'),
  dataUrl(mono.file, 'font/woff2'),
  dataUrl('globe-still.svg', 'image/svg+xml'),
  dataUrl('logo.svg', 'image/svg+xml')
]);

const satellites = constellation.planes.length * constellation.satellitesPerPlane;
const readout = [
  `${satellites} satellites`,
  `${constellation.planes.length} planes`,
  `${constellation.altitudeKm} km`,
  '50 cm',
  '8 bands'
].join('  ·  ');

const esc = (s) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

const html = (page) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: D; src: url(${displayFont}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: M; src: url(${monoFont}) format('woff2'); font-weight: 500; }
* { margin: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; overflow: hidden; background: ${c.background}; color: ${c.text}; }
body { position: relative; font-family: D, sans-serif; }
.globe { position: absolute; width: 860px; height: 860px; right: -250px; top: -60px; opacity: 0.95; }
.fade { position: absolute; inset: 0; background: linear-gradient(90deg, ${c.background} 34%, transparent 72%); }
.frame { position: absolute; inset: 36px; }
.frame i { position: absolute; width: 18px; height: 18px; border-color: ${c.lineStrong}; border-style: solid; }
.frame i:nth-child(1) { left: 0; top: 0; border-width: 1px 0 0 1px; }
.frame i:nth-child(2) { right: 0; top: 0; border-width: 1px 1px 0 0; }
.frame i:nth-child(3) { left: 0; bottom: 0; border-width: 0 0 1px 1px; }
.frame i:nth-child(4) { right: 0; bottom: 0; border-width: 0 1px 1px 0; }
.ticks { position: absolute; left: 36px; right: 36px; height: 8px; bottom: 36px;
  background: repeating-linear-gradient(90deg, ${c.line} 0 1px, transparent 1px 12px); }
.content { position: absolute; left: 76px; top: 72px; bottom: 76px; width: 720px; display: flex; flex-direction: column; }
.brand { display: flex; align-items: center; gap: 14px; }
.brand img { width: 40px; height: 40px; }
.brand span { font-family: M; font-size: 20px; letter-spacing: 0.16em; text-transform: uppercase; }
.kicker { margin-top: auto; font-family: M; font-size: 18px; letter-spacing: 0.14em; text-transform: uppercase; color: ${c.accent}; display: flex; align-items: center; gap: 12px; }
.kicker b { width: 9px; height: 9px; background: ${c.accent}; display: inline-block; }
h1 { margin-top: 22px; font-weight: 600; font-stretch: ${display.displayStretch}; font-size: 104px; line-height: 0.9; text-transform: uppercase; letter-spacing: -0.01em; }
.readout { margin-top: 34px; font-family: M; font-size: 16px; letter-spacing: 0.12em; text-transform: uppercase; color: ${c.muted}; }
</style></head><body>
<img class="globe" src="${globe}" alt="">
<div class="fade"></div>
<div class="frame"><i></i><i></i><i></i><i></i></div>
<div class="ticks"></div>
<div class="content">
  <div class="brand"><img src="${logo}" alt=""><span>${esc(siteConfig.company)}</span></div>
  <p class="kicker"><b></b>${esc(page.share.kicker)}</p>
  <h1>${esc(page.share.headline)}</h1>
  <p class="readout">${esc(readout)}</p>
</div>
</body></html>`;

await mkdir(join(root, 'public/og'), { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [id, meta] of Object.entries(pages)) {
    if (!meta.image?.startsWith('/og/')) continue;
    await page.setContent(html(meta), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const out = join(root, 'public', meta.image);
    await page.screenshot({ path: out, type: 'png' });
    console.log(`✓ ${id}: ${meta.image}`);
  }
} finally {
  await browser.close();
}
