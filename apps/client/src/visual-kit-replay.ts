import { debug } from './debug.js';

/** Client-only replay of a hero's VFX; returns false when it could not run (no caster in view…). */
export type ReplayFn = (kind: string | undefined, x?: number, z?: number) => boolean;

const replays = new Map<string, ReplayFn>();

/** Registers a hero's replay; returns the unregister function. */
export function registerReplay(heroId: string, replay: ReplayFn): () => void {
  replays.set(heroId, replay);
  return () => { if (replays.get(heroId) === replay) replays.delete(heroId); };
}

/**
 * `?debug=1` only: defines `window.__vfxReplay(heroId, kind?, x?, z?)`. Pure presentation; nothing is
 * sent to the server. Returns the uninstall function (a no-op when debug is off).
 */
export function installReplay(target: object, search: string = location.search): () => void {
  if (!new URLSearchParams(search).has('debug')) return () => undefined;
  Object.defineProperty(target, '__vfxReplay', { configurable: true,
    value: (heroId: string, kind?: string, x?: number, z?: number): boolean => {
      const replay = replays.get(heroId);
      const ok = replay ? replay(kind, x, z) : false;
      debug('visual.kit.replay', { heroId, kind: kind ?? 'default', ok });
      return ok;
    } });
  return () => { Reflect.deleteProperty(target, '__vfxReplay'); };
}
