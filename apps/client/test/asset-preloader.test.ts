import { describe, expect, it } from 'vitest';
import { AssetPreloader, PRELOAD_CONCURRENCY } from '../src/asset-preloader.js';

const files = Array.from({ length: 10 }, (_, i) => ({ path: `f${i}.webp`, bytes: 100 }));
const ok = (): Response => new Response(new Uint8Array(4), { status: 200 });

describe('lobby asset preloader', () => {
  it('never runs more than the concurrency cap and uses low priority', async () => {
    let active = 0, peak = 0;
    const priorities = new Set<string | undefined>();
    const preloader = new AssetPreloader(files, async (_url, init) => {
      priorities.add(init.priority);
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 2));
      active--;
      return ok();
    });
    const result = await preloader.start();
    expect(peak).toBeLessThanOrEqual(PRELOAD_CONCURRENCY);
    expect(priorities).toEqual(new Set(['low']));
    expect(result).toMatchObject({ done: 10, total: 10, bytesDone: 1000, bytesTotal: 1000, failed: 0, finished: true });
  });

  it('retries a failed file once, then counts it as failed and still finishes', async () => {
    const calls = new Map<string, number>();
    const preloader = new AssetPreloader(files.slice(0, 3), async url => {
      calls.set(url, (calls.get(url) ?? 0) + 1);
      if (url.includes('f1')) throw new Error('offline');
      if (url.includes('f2') && calls.get(url) === 1) return new Response('', { status: 503 });
      return ok();
    });
    const result = await preloader.start();
    expect(calls.get('/assets/f1.webp')).toBe(2);
    expect(calls.get('/assets/f2.webp')).toBe(2);
    expect(result).toMatchObject({ done: 3, failed: 1, finished: true });
  });

  it('reports progress to subscribers and is idempotent', async () => {
    const preloader = new AssetPreloader(files.slice(0, 2), async () => ok());
    const seen: number[] = [];
    preloader.subscribe(progress => seen.push(progress.done));
    const [a, b] = await Promise.all([preloader.start(), preloader.start()]);
    expect(a.finished && b.finished).toBe(true);
    expect(seen).toEqual([0, 1, 2, 2]);
  });

  it('is finished immediately with nothing to load', () => {
    expect(new AssetPreloader([]).progress.finished).toBe(true);
  });
});
