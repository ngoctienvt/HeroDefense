// node tools/vfx-preview/battle-capture.mjs DIR OUT "heroes=h009,h00E" "h009[:kind]|-" "0.1,0.3,0.6" [w h] — see README.md
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
const [dir, out, query, replay, times = '0.2,0.5,1,2', W = '960', H = '640'] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.json': 'application/json', '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const p = join(dir, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H } });
const logs = [];
page.on('console', m => { const t = m.text(); if (/error|fallback|replay|skip|kimtra|hero-model/i.test(t)) logs.push(t.slice(0, 200)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
// fake clock: the slow software renderer would otherwise skip most of a 1 s effect between two screenshots
await page.clock.install({ time: new Date('2026-10-26T10:00:00Z') });
await page.goto(`http://localhost:${server.address().port}/index.html?debug=1&${query}`);
for (let i = 0; i < 600 && !(await page.evaluate(() => window.__dev?.ready?.())); i++) { await page.clock.runFor(100); await page.waitForTimeout(20); }
for (let i = 0; i < 40; i++) { await page.clock.runFor(100); await page.waitForTimeout(100); } // models + atlases load
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100)); // from here only runFor moves time
mkdirSync(out, { recursive: true });
// closer camera than the default lane view: the review is about the effect around the hero
await page.evaluate((z) => { for (let i = 0; i < z; i++) window.__dev.battlefield.zoom(true, 1.35); }, Number(process.env.ZOOM ?? 2));
const grab = async (file) => {
  const data = await page.evaluate(() => { const b = window.__dev.battlefield; b.scene.render(); return b.scene.getEngine().getRenderingCanvas().toDataURL('image/png'); });
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
};
await grab(join(out, '00_board.png'));
if (replay === '-') { // no replay: just let the match run and grab the board at the given seconds
  let now = 0, i = 1;
  for (const t of times.split(',').map(Number)) {
    while (now < t * 1000 - 1) { const step = Math.min(1000 / 20, t * 1000 - now); await page.clock.runFor(step); now += step; }
    await grab(join(out, `${String(i++).padStart(2, '0')}_t${t}.png`));
    logs.push(`t${t} ` + JSON.stringify(await page.evaluate(() => window.__dev.stats?.())));
  }
} else if (replay) {
  const [hero, kind] = replay.split(':');
  const ok = await page.evaluate(([h, k]) => window.__vfxReplay?.(h, k), [hero, kind]);
  logs.push('replay ' + ok);
  let now = 0, i = 1;
  for (const t of times.split(',').map(Number)) {
    while (now < t * 1000 - 1) { const step = Math.min(1000 / 60, t * 1000 - now); await page.clock.runFor(step); now += step; }
    await grab(join(out, `${String(i++).padStart(2, '0')}_t${t}.png`));
  }
}
logs.push('stats ' + JSON.stringify(await page.evaluate(() => window.__dev.stats?.())));
console.log(JSON.stringify(logs.slice(-12), null, 1));
await browser.close(); server.close();
