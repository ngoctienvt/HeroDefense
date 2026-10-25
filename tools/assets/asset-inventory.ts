// Inventory of apps/client/public/assets: which runtime files the client can actually request.
// Read-only. Usage: npx tsx tools/assets/asset-inventory.ts [--json out.json]
import { writeFileSync } from 'node:fs';
import { buildAssetManifest, scanAssets, type AssetEntry, type AssetStatus } from './asset-references.js';

const entries = scanAssets(process.cwd());
const mb = (bytes: number): string => (bytes / 1048576).toFixed(2);
const groups = new Map<AssetStatus, AssetEntry[]>();
for (const entry of entries) groups.set(entry.status, [...(groups.get(entry.status) ?? []), entry]);
const sum = (list: AssetEntry[]): number => list.reduce((total, entry) => total + entry.bytes, 0);

console.log(`Total: ${entries.length} files, ${mb(sum(entries))} MB`);
for (const [status, list] of groups) console.log(`  ${status}: ${list.length} files, ${mb(sum(list))} MB`);
const manifest = buildAssetManifest(entries);
console.log(`  preload list: ${manifest.preload.length} files, ${mb(manifest.preload.reduce((t, f) => t + f.bytes, 0))} MB`);
for (const status of ['unreferenced', 'test'] as const) {
  const list = groups.get(status);
  if (!list) continue;
  console.log(`\n## ${status}`);
  for (const entry of [...list].sort((a, b) => b.bytes - a.bytes)) console.log(`${mb(entry.bytes).padStart(7)} MB  ${entry.path}`);
}
console.log('\n## largest preloaded');
const preloaded = new Set(manifest.preload.map(file => file.path));
for (const entry of entries.filter(e => preloaded.has(e.path)).sort((a, b) => b.bytes - a.bytes).slice(0, 15)) {
  console.log(`${mb(entry.bytes).padStart(7)} MB  ${entry.path}  (${entry.status})`);
}
const jsonIndex = process.argv.indexOf('--json');
if (jsonIndex > 0 && process.argv[jsonIndex + 1]) writeFileSync(process.argv[jsonIndex + 1], JSON.stringify(entries, null, 2));
