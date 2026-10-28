import { SYNERGIES } from '../../../content/catalog.js';
import type { GameState } from '../../../packages/contracts/src/types.js';

/** At most one toast per bond in this many seconds of game time. */
export const BOND_TOAST_GAP_SECONDS = 3;

const NAMES = new Map(SYNERGIES.map(s => [s.id, s.name]));

/**
 * Turns the player's own `bond-trigger` events into short toast lines. A first or reconnected snapshot
 * only carries history, so it is skipped; `reducedMotion` leaves toasts unchanged (they are the
 * non-motion feedback) and only affects which VFX the battlefield may play.
 */
export class BondToastCursor {
  private identity = '';
  private lastEvent = 0;
  private lastShown = new Map<number, number>();

  observe(state: GameState, selfId: string): { bondId: number; message: string }[] {
    const identity = `${state.roomCode}:${selfId}`;
    const latest = state.events.reduce((max, event) => Math.max(max, event.id), 0);
    if (this.identity !== identity) {
      this.identity = identity; this.lastEvent = latest; this.lastShown.clear();
      return [];
    }
    const toasts: { bondId: number; message: string }[] = [];
    for (const event of state.events) {
      if (event.id <= this.lastEvent || event.kind !== 'bond-trigger' || event.owner !== selfId || event.bondId === undefined) continue;
      const at = event.at ?? state.elapsed, last = this.lastShown.get(event.bondId);
      if (last !== undefined && at - last < BOND_TOAST_GAP_SECONDS && at >= last) continue;
      this.lastShown.set(event.bondId, at);
      const name = NAMES.get(event.bondId) ?? `Duyên ${event.bondId}`;
      toasts.push({ bondId: event.bondId, message: event.text ? `${name}: ${event.text}` : `${name} kích hoạt` });
    }
    this.lastEvent = Math.max(this.lastEvent, latest);
    return toasts;
  }

  reset(): void { this.identity = ''; this.lastEvent = 0; this.lastShown.clear(); }
}
