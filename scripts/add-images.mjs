#!/usr/bin/env node
/**
 * Adds images to the site.
 *
 *   pnpm add-images path/to/photo.jpg [more files...] [--name custom-name]
 *
 * For each file it writes WebP versions 800, 1600, and 2880 px wide (never
 * wider than the original) to public/images/, and records the size, the
 * files, and a tiny blurred placeholder in src/content/images.json under the
 * file's name. Use that name with <ResponsiveImage name="..."> or in
 * src/content/screens.ts.
 *
 * GIFs are copied untouched so their animation survives. SVGs are rejected:
 * vector art belongs in a component or directly in public/.
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'images');
const manifestPath = join(root, 'src', 'content', 'images.json');
const WIDTHS = [800, 1600, 2880];
const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);

const args = process.argv.slice(2);
const files = [];
let customName;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--name') customName = args[++i];
  else files.push(args[i]);
}

if (!files.length) {
  console.error('Usage: pnpm add-images <file> [more files...] [--name custom-name]');
  process.exit(1);
}
if (customName && files.length > 1) {
  console.error('--name works with one file at a time.');
  process.exit(1);
}

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');

async function blurOf(input) {
  const buf = await sharp(input, { animated: false }).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'));
await mkdir(outDir, { recursive: true });
let failed = 0;

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const name = slug(customName ?? basename(file, extname(file)));
  if (ext === '.svg') {
    console.error(`✗ ${file}: SVG is not supported. Put vector art in a component or in public/ as is.`);
    failed++;
    continue;
  }
  if (ext !== '.gif' && !RASTER.has(ext)) {
    console.error(`✗ ${file}: unsupported type ${ext || '(none)'}. Use JPG, PNG, WebP, AVIF, TIFF, or GIF.`);
    failed++;
    continue;
  }
  let meta;
  try {
    meta = await sharp(file, { animated: ext === '.gif' }).metadata();
  } catch (err) {
    console.error(`✗ ${file}: could not read it (${err.message}).`);
    failed++;
    continue;
  }
  // EXIF orientations 5–8 are rotated a quarter turn; sharp's rotate() applies them.
  const turned = (meta.orientation ?? 1) >= 5;
  const width = turned ? meta.height : meta.width;
  // Animated GIFs report the stacked height of all frames.
  const height = ext === '.gif' ? (meta.pageHeight ?? meta.height) : turned ? meta.width : meta.height;
  const blur = await blurOf(file);

  if (ext === '.gif') {
    const out = `${name}.gif`;
    await copyFile(file, join(outDir, out));
    manifest[name] = { width, height, blur, sources: [{ width, src: `/images/${out}` }], type: 'image/gif' };
    console.log(`✓ ${name}: GIF copied as is (${width}×${height})`);
    continue;
  }

  // 800, 1600, 2880, capped at the original: a 2000 px photo gives 800, 1600, 2000.
  const largest = Math.min(width, WIDTHS[WIDTHS.length - 1]);
  const targets = [...WIDTHS.filter((w) => w < largest), largest];
  const sources = [];
  for (const w of targets) {
    const out = `${name}-${w}.webp`;
    await sharp(file).rotate().resize({ width: w }).webp({ quality: 82 }).toFile(join(outDir, out));
    sources.push({ width: w, src: `/images/${out}` });
  }
  manifest[name] = { width, height, blur, sources, type: 'image/webp' };
  console.log(`✓ ${name}: ${sources.map((s) => s.width).join(', ')} px WebP (${width}×${height})`);
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
if (failed) process.exit(1);
