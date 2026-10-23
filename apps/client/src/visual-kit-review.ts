import { HERO_BY_ID } from '../../../content/catalog.js';
import { TIER3_REPLAY_IDS } from './visual-tier3-heroes.js';
import { replayHero } from './visual-kit-replay.js';
import { debug, debugLog } from './debug.js';

/** Debug-only UI: samples the real rendered canvas; it never creates units or changes combat state. */
export function installReplayReview(canvas: HTMLCanvasElement): () => void {
  if (!new URLSearchParams(location.search).has('debug')) return () => undefined;
  const bar = document.createElement('aside'); bar.setAttribute('aria-label', 'Duyệt VFX');
  bar.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:4000;background:#17252cf5;color:#fff;padding:5px;display:flex;gap:6px;align-items:center;font:12px sans-serif;max-width:96vw;flex-wrap:wrap';
  const hero = document.createElement('select'); hero.setAttribute('aria-label', 'Tướng VFX');
  hero.style.cssText = 'width:170px;min-width:0;height:28px;padding:2px;font-size:12px';
  for (const id of [...TIER3_REPLAY_IDS, 'h00Q', 'h01G', 'h041']) {
    const option = document.createElement('option'); option.value = id; option.textContent = HERO_BY_ID[id]?.name ?? id; hero.append(option);
  }
  const kind = document.createElement('select'); kind.setAttribute('aria-label', 'Pha VFX');
  kind.style.cssText = 'width:90px;min-width:0;height:28px;padding:2px;font-size:12px';
  for (const value of ['ultimate', 'burst', 'hit', 'rebirth']) {
    const option = document.createElement('option'); option.value = value; option.textContent = value; kind.append(option);
  }
  const message = document.createElement('span'); message.setAttribute('role', 'status');
  const play = document.createElement('button'); play.textContent = 'Phát VFX';
  const capture = document.createElement('button'); capture.textContent = 'Chụp nhịp VFX';
  let cancelled = false, busy = false, sheet: HTMLElement | undefined, imageUrl: string | undefined;
  const releaseImage = () => { if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = undefined; };
  const timers = new Set<number>();
  const invoke = () => {
    const ok = replayHero(hero.value, kind.value);
    message.textContent = ok ? 'Đang phát' : 'Cần tướng sống trong khu; kiểm tra pha đã chọn';
    return ok;
  };
  play.onclick = () => { if (!busy) invoke(); };
  capture.onclick = () => {
    if (busy || !invoke()) return;
    busy = true; play.disabled = capture.disabled = true; sheet?.remove(); releaseImage(); canvas.dataset.vfxReviewBusy = 'true';
    const times = [.1, .25, .45, .7, 1.2, 3, 5.8, 6.5];
    const width = 480, height = Math.round(canvas.height / canvas.width * width);
    const image = document.createElement('canvas'); image.width = width * 2; image.height = (height + 25) * 4;
    const ctx = image.getContext('2d'); if (!ctx) { busy = false; delete canvas.dataset.vfxReviewBusy; play.disabled = capture.disabled = false; return; }
    const id = hero.value, phase = kind.value, start = performance.now(), samples: number[] = [];
    for (const [index, seconds] of times.entries()) {
      const timer = window.setTimeout(() => {
        timers.delete(timer); if (cancelled) return;
        const elapsed = (performance.now() - start) / 1000; samples.push(elapsed);
        const x = index % 2 * width, y = Math.floor(index / 2) * (height + 25);
        ctx.fillStyle = '#16232c'; ctx.fillRect(x, y, width, height + 25);
        ctx.drawImage(canvas, x, y + 25, width, height);
        ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.fillText(`${HERO_BY_ID[id]?.name} ${phase} · ${elapsed.toFixed(3)}s`, x + 8, y + 18);
        if (index !== times.length - 1) return;
        busy = false; delete canvas.dataset.vfxReviewBusy; play.disabled = capture.disabled = false; bar.style.display = 'none';
        sheet = document.createElement('section'); sheet.setAttribute('aria-label', 'Ảnh nhịp VFX');
        sheet.style.cssText = 'position:fixed;inset:48px 8px 8px;z-index:3900;background:#17252c;overflow:auto;padding:8px;color:white';
        const close = document.createElement('button'); close.textContent = 'Đóng ảnh nhịp'; close.onclick = () => { sheet?.remove(); releaseImage(); bar.style.display = 'flex'; };
        const download = document.createElement('a'); download.textContent = 'Tải ảnh nhịp';
        download.download = `vfx-${id}-${phase}.png`; download.href = image.toDataURL('image/png'); download.style.cssText = 'color:#ffe399;margin:12px';
        const rendered = document.createElement('img'); rendered.alt = `Ảnh nhịp ${id} ${phase}`; rendered.src = download.href; rendered.style.cssText = 'display:block;width:min(100%,960px);height:auto';
        rendered.dataset.capturePng = download.href;
        image.toBlob(blob => {
          if (!blob || cancelled || !sheet?.isConnected) return;
          imageUrl = URL.createObjectURL(blob); download.href = rendered.src = imageUrl;
        }, 'image/png');
        sheet.append(close, download, rendered); document.body.append(sheet); message.textContent = 'Đã chụp canvas thật';
        debug('visual.review.capture', { heroId: id, phase, samples, hidden: document.hidden,
          diagnostics: debugLog().filter(entry => /shader.error|asset.error|atlas.invalid|performance/.test(entry.event)).slice(-8) });
      }, seconds * 1000); timers.add(timer);
    }
  };
  bar.append(hero, kind, play, capture, message); document.body.append(bar);
  return () => { cancelled = true; releaseImage(); delete canvas.dataset.vfxReviewBusy; for (const timer of timers) window.clearTimeout(timer); bar.remove(); sheet?.remove(); };
}
