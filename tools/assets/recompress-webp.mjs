// Re-encodes runtime hero sheets/portraits from lossless (q100) WebP to lossy RGB + lossless alpha.
// Canvas size, cell layout and anchors are untouched, so atlas JSON stays valid.
// Masters stay recoverable from git history (these files are tracked).
// Usage: node tools/assets/recompress-webp.mjs [--quality 90] [--dry-run] [glob-prefix ...]
//   default prefixes: hero-stylized- hero-portrait- hero-motion-h01B
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const qualityIndex = args.indexOf('--quality');
const quality = qualityIndex >= 0 ? Number(args[qualityIndex + 1]) : 90;
if (!Number.isInteger(quality) || quality < 50 || quality > 99) throw new Error('--quality must be 50..99');
const prefixes = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--quality');
const wanted = prefixes.length ? prefixes : ['hero-stylized-', 'hero-portrait-', 'hero-motion-h01B'];
const dir = join(process.cwd(), 'apps/client/public/assets');

const magick = (...a) => execFileSync('magick', a, { encoding: 'utf8' }).trim();
let before = 0, after = 0, changed = 0;
for (const name of readdirSync(dir).filter(n => n.endsWith('.webp') && wanted.some(p => n.startsWith(p))).sort()) {
  const file = join(dir, name);
  // Already lossy files report a quality below 100; skipping keeps the script idempotent.
  const [size, q] = magick('identify', '-format', '%wx%h %Q', file).split(' ');
  const original = statSync(file).size;
  if (Number(q) < 100) { console.log(`skip  ${name} (q${q})`); continue; }
  const temp = `${file}.tmp.webp`;
  magick(file, '-quality', String(quality), '-define', 'webp:alpha-quality=100', '-define', 'webp:method=6', temp);
  const [tempSize] = magick('identify', '-format', '%wx%h', temp).split(' ');
  const encoded = statSync(temp).size;
  if (tempSize !== size || encoded >= original) { rmSync(temp); console.log(`keep  ${name}`); continue; }
  before += original; after += encoded; changed++;
  if (flag('--dry-run')) rmSync(temp); else renameSync(temp, file);
  console.log(`${flag('--dry-run') ? 'would' : 'wrote'} ${name} ${size} ${(original / 1024) | 0}K -> ${(encoded / 1024) | 0}K`);
}
console.log(`\n${changed} files, ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB (q${quality})`);
