/**
 * Lobby preloader: downloads every runtime asset into the browser's HTTP cache before play, so
 * summons, bosses and skills appear mid-match without a network wait. Plain-HTTP hosts (Radmin VPN)
 * are not a secure context, so Cache Storage/Service Workers are unavailable; the versioned URLs plus
 * the server's one-year immutable header make the HTTP cache reliable instead.
 *
 * At most 4 requests run at once with low priority: HTTP/1.1 allows 6 connections per host and room
 * API calls (12 s timeout) or on-demand texture loads must not queue behind large sheets.
 */
import { assetUrl } from './asset-version.js';
import { debug } from './debug.js';

export interface PreloadFile { path: string; bytes: number }
export interface PreloadProgress {
  done: number; total: number; bytesDone: number; bytesTotal: number;
  failed: number; finished: boolean;
}
type Fetcher = (url: string, init: RequestInit & { priority?: 'low' | 'high' | 'auto' }) => Promise<Response>;

export const PRELOAD_CONCURRENCY = 4;
const RETRIES = 1;

export class AssetPreloader {
  private listeners = new Set<(progress: PreloadProgress) => void>();
  private state: PreloadProgress;
  private started = false;

  constructor(private readonly files: readonly PreloadFile[], private readonly fetcher: Fetcher = (url, init) => fetch(url, init)) {
    this.state = { done: 0, total: files.length, bytesDone: 0, bytesTotal: files.reduce((sum, f) => sum + f.bytes, 0),
      failed: 0, finished: files.length === 0 };
  }

  get progress(): PreloadProgress { return { ...this.state }; }

  /** Calls back immediately with the current state, then on every change. Returns an unsubscribe. */
  subscribe(listener: (progress: PreloadProgress) => void): () => void {
    this.listeners.add(listener);
    listener(this.progress);
    return () => this.listeners.delete(listener);
  }

  /** Idempotent. Resolves when every file has loaded or failed; never rejects, so the Ready gate always opens. */
  start(): Promise<PreloadProgress> {
    if (this.started) return this.finished();
    this.started = true;
    const began = performance.now();
    debug('visual.preload.start', { files: this.state.total, megabytes: Math.round(this.state.bytesTotal / 1048576) });
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < this.files.length) {
        const file = this.files[next++];
        const ok = await this.fetchOne(file);
        this.state = { ...this.state, done: this.state.done + 1, bytesDone: this.state.bytesDone + file.bytes,
          failed: this.state.failed + (ok ? 0 : 1) };
        this.emit();
      }
    };
    const workers = Array.from({ length: Math.min(PRELOAD_CONCURRENCY, this.files.length) }, worker);
    return Promise.all(workers).then(() => {
      this.state = { ...this.state, finished: true };
      debug('visual.preload.done', { files: this.state.done, failed: this.state.failed, seconds: Math.round((performance.now() - began) / 1000) });
      this.emit();
      return this.progress;
    });
  }

  private finished(): Promise<PreloadProgress> {
    if (this.state.finished) return Promise.resolve(this.progress);
    return new Promise(resolve => {
      const stop = this.subscribe(progress => { if (progress.finished) { stop(); resolve(progress); } });
    });
  }

  private async fetchOne(file: PreloadFile): Promise<boolean> {
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        const response = await this.fetcher(assetUrl(`/assets/${file.path}`), { priority: 'low' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        // Reading the body is what commits the response to the HTTP cache.
        await response.arrayBuffer();
        return true;
      } catch (error) {
        if (attempt === RETRIES) {
          debug('visual.preload.failed', { file: file.path, error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
    return false;
  }

  private emit(): void { for (const listener of this.listeners) listener(this.progress); }
}
