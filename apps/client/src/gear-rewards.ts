import type { GameEvent, GameState } from '../../../packages/contracts/src/types.js';

/** A first/reconnected snapshot is history. Only later, owner-addressed rewards may notify. */
export class GearRewardCursor {
  private identity = '';
  private lastEvent = 0;

  observe(state: GameState, selfId: string): GameEvent[] {
    const identity = `${state.roomCode}:${selfId}`;
    const latest = state.events.reduce((max, event) => Math.max(max, event.id), 0);
    if (this.identity !== identity) {
      this.identity = identity; this.lastEvent = latest;
      return [];
    }
    const rewards = state.events.filter(event => event.id > this.lastEvent && event.kind === 'reward' && event.skillId === 'gear-drop' && event.owner === selfId);
    this.lastEvent = Math.max(this.lastEvent, latest);
    return rewards;
  }

  reset(): void { this.identity = ''; this.lastEvent = 0; }
}
