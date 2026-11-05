#!/usr/bin/env node
/**
 * Draws every icon from public/logo.svg:
 *
 *   pnpm build:icons
 *
 * Writes public/logo.png (1024), favicon.ico (16, 32, 48), favicon-16x16.png,
 * favicon-32x32.png, favicon.png (32), apple-touch-icon.png (180), and
 * android-chrome-192x192.png and -512x512.png. Rerun after changing the logo.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (name) => join(root, 'public', name);
const svg = await readFile(pub('logo.svg'));
const { siteConfig } = await import(new URL('../src/site.config.ts', import.meta.url).href);
const background = siteConfig.colors.background;

/** The logo at `size` px. `fill` paints the rounded corners for icons that get masked. */
const render = (size, fill = false) => {
  const img = sharp(svg, { density: Math.ceil((72 * size) / 64) * 2 }).resize(size, size);
  return (fill ? img.flatten({ background }) : img).png({ compressionLevel: 9 }).toBuffer();
};

const outputs = [
  ['logo.png', 1024, false],
  ['favicon-16x16.png', 16, false],
  ['favicon-32x32.png', 32, false],
  ['favicon.png', 32, false],
  // iOS and Android round the corners themselves.
  ['apple-touch-icon.png', 180, true],
  ['android-chrome-192x192.png', 192, true],
  ['android-chrome-512x512.png', 512, true]
];
for (const [name, size, fill] of outputs) {
  await writeFile(pub(name), await render(size, fill));
  console.log(`✓ ${name}`);
}

// favicon.ico: PNG images in an ICO container (supported by every current browser).
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => render(s)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
await writeFile(pub('favicon.ico'), Buffer.concat([header, ...images]));
console.log('✓ favicon.ico');
