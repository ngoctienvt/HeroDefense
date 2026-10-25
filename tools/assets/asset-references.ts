// Which files under apps/client/public/assets the client can request, plus a content hash per file.
// Shared by the inventory CLI (tools/assets/asset-inventory.ts) and the Vite asset-manifest plugin.
//
// A file counts as referenced when its name is
//   1. "exact"   - written literally in client source/JSON manifests, or in a referenced public JSON;
//   2. "pattern" - produced by a template such as `vfx-truong-${id}` whose placeholder value appears
//                  as a string literal or catalog id (a fragment without extension only matches .webp);
//   3. "test"    - only mentioned by client tests;
//   4. "unreferenced".
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';

export type AssetStatus = 'exact' | 'pattern' | 'test' | 'unreferenced';
export interface AssetEntry { path: string; bytes: number; hash: string; status: AssetStatus }

/**
 * Referenced by code, but only on fallback branches the current roster never takes: every hero has a
 * stylized sheet except h01B (hero-motion-h01B, portrait atlas 5). Preloading these would waste bandwidth.
 */
export const DEAD_FALLBACKS: readonly RegExp[] = [
  /^hero-sprites-\d+\.webp$/,
  /^hero-portraits-[0-46-8]\.webp$/,
  /^hero-motion-(?!h01B\.webp$).+\.webp$/,
];

function walk(dir: string, filter: (file: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

// JSON in src holds VFX/atlas manifests imported by TS modules.
const codeFile = (file: string): boolean => /\.(ts|tsx|js|mjs|css|html|json)$/.test(file);
const readAll = (files: string[]): string => files.map(file => readFileSync(file, 'utf8')).join('\n');
const contentHash = (file: string): string => createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 10);

interface Pattern { fixed: string[]; ext: string | null }

export function scanAssets(root: string): AssetEntry[] {
  const clientDir = join(root, 'apps/client');
  const assetsDir = join(clientDir, 'public/assets');
  const srcText = readAll(walk(join(clientDir, 'src'), codeFile).concat(join(clientDir, 'index.html')));
  const testText = readAll(walk(join(clientDir, 'test'), codeFile));

  // Placeholder values: quoted literals in client source plus catalog hero ids.
  const literals = new Set<string>();
  for (const match of srcText.matchAll(/'([^'\n]{1,80})'|"([^"\n]{1,80})"/g)) literals.add(match[1] ?? match[2]);
  const catalog = JSON.parse(readFileSync(join(root, 'content/data/catalog.json'), 'utf8')) as { heroes?: { id?: string }[] };
  for (const hero of catalog.heroes ?? []) if (hero.id) literals.add(hero.id);
  const isValue = (value: string): boolean => literals.has(value) || /^\d+$/.test(value);

  // Template fragments like `hero-stylized-${heroId}` or `vfx-${this.slug}-${id}`, nested ones included.
  const patterns: Pattern[] = [];
  for (const match of srcText.matchAll(/([A-Za-z0-9_./-]*)((?:\$\{[^}`]*\}[A-Za-z0-9_.-]*)+)/g)) {
    const parts = match[0].split(/\$\{[^}]*\}/);
    const head = parts[0].replace(/^.*\/assets\//, '').replace(/^\//, '');
    // Fully generic shapes such as `${key}.webp` match everything; those call sites are reviewed by hand.
    if (!/[a-z0-9]/i.test(head)) continue;
    const last = parts.length - 1;
    const ext = parts[last].match(/\.(webp|json|glb|mp3|ogg|png)$/)?.[0] ?? null;
    const fixed = [head, ...parts.slice(1)].map((part, i) => i === last && ext ? part.slice(0, -ext.length) : part);
    patterns.push({ fixed, ext });
  }
  // True when `name` = fixed[0] + v1 + fixed[1] + v2 ... with every v a known value; tries every split.
  const fits = (name: string, fixed: string[], i = 0): boolean => {
    if (i === fixed.length - 1) return name === fixed[i];
    if (!name.startsWith(fixed[i])) return false;
    const rest = name.slice(fixed[i].length);
    for (let cut = 1; cut <= rest.length; cut++) {
      if (isValue(rest.slice(0, cut)) && fits(rest.slice(cut), fixed, i + 1)) return true;
    }
    return false;
  };

  const files = walk(assetsDir, () => true).map(full => ({
    full,
    path: relative(assetsDir, full).replaceAll('\\', '/'),
    stem: basename(full, extname(full)),
    ext: extname(full),
    bytes: statSync(full).size,
  }));
  type File = typeof files[number];
  const classify = (file: File, corpus: string): AssetStatus | null => {
    if (corpus.includes(file.path) || corpus.includes(file.stem)) return 'exact';
    const bare = file.path.slice(0, -file.ext.length);
    const names = [bare, bare.split('/').pop()!];
    for (const { fixed, ext } of patterns) {
      if ((ext ?? '.webp') !== file.ext) continue;
      if (names.some(name => fits(name, fixed))) return 'pattern';
    }
    return null;
  };

  // Public JSON can name further files; only JSON already referenced counts, so iterate.
  const status = new Map<string, AssetStatus>();
  let corpus = srcText;
  for (let pass = 0; pass < 4; pass++) {
    for (const file of files) if (!status.has(file.path)) {
      const kind = classify(file, corpus);
      if (kind) status.set(file.path, kind);
    }
    corpus = srcText + files.filter(f => f.ext === '.json' && status.has(f.path)).map(f => readFileSync(f.full, 'utf8')).join('\n');
  }
  return files.map(file => ({
    path: file.path,
    bytes: file.bytes,
    hash: contentHash(file.full),
    status: status.get(file.path) ?? (testText.includes(file.stem) ? 'test' : 'unreferenced'),
  }));
}

export interface AssetManifest {
  /** Hash of all file hashes; changes whenever any runtime asset changes. */
  version: string;
  /** Published path (relative to /assets/) -> content hash, for every shipped file. */
  files: Record<string, string>;
  /** Files the lobby preloader fetches: referenced, minus dead fallbacks. */
  preload: { path: string; bytes: number }[];
}

export function buildAssetManifest(entries: AssetEntry[]): AssetManifest {
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  const files = Object.fromEntries(sorted.map(entry => [entry.path, entry.hash]));
  const preload = sorted
    .filter(entry => (entry.status === 'exact' || entry.status === 'pattern') && !DEAD_FALLBACKS.some(rule => rule.test(entry.path)))
    .map(entry => ({ path: entry.path, bytes: entry.bytes }));
  const version = createHash('sha1').update(sorted.map(e => `${e.path}:${e.hash}`).join('\n')).digest('hex').slice(0, 10);
  return { version, files, preload };
}
