// node capture.mjs DIR OUTDIR [query] — serves DIR, opens index.html in headless Chromium (SwiftShader WebGL),
// waits for window.__done and writes window.__shots as PNG files.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
const [dir, out, query = ''] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = join(dir, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
const logs = [];
page.on('console', m => logs.push(m.text()));
page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
await page.goto(`http://localhost:${port}/index.html?${query}`);
await page.waitForFunction(() => window.__done || window.__error, null, { timeout: 180000 });
const err = await page.evaluate(() => window.__error);
const shots = await page.evaluate(() => window.__shots);
mkdirSync(out, { recursive: true });
shots.forEach((s, i) => { const [label, data] = s.split('|'); writeFileSync(join(out, `${String(i).padStart(2, '0')}_${label.replace(/[^a-z0-9.]+/gi, '_')}.png`), Buffer.from(data.split(',')[1], 'base64')); });
console.log(JSON.stringify({ shots: shots.length, err, logs: logs.filter(l => /error|kimtra|kit\./i.test(l)).slice(0, 20) }, null, 1));
await browser.close(); server.close();
