import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { createGame } from '../../../packages/game-core/src/index.js';
import { GearRewardCursor } from '../src/gear-rewards.js';

const reward = (id: number, owner = 'p1', patch: Partial<GameEvent> = {}): GameEvent => ({ id, kind: 'reward', skillId: 'gear-drop', target: `g${id}`, owner, ...patch });

describe('private loot notifications', () => {
  it('skips history and only delivers new gear rewards to their owner once', () => {
    const cursor = new GearRewardCursor(), state = createGame('ROOM01', 1, 'normal');
    state.events = [reward(1)]; expect(cursor.observe(state, 'p1')).toEqual([]);
    state.events.push(reward(2, 'p2'), reward(3, undefined, { owner: undefined }), reward(4, 'p1', { skillId: 'other-reward' }), reward(5));
    expect(cursor.observe(state, 'p1').map(event => event.id)).toEqual([5]);
    expect(cursor.observe(state, 'p1')).toEqual([]);
  });

  it('does not replay drops after reconnect or room change', () => {
    const cursor = new GearRewardCursor(), state = createGame('ROOM01', 1, 'normal');
    cursor.observe(state, 'p1'); state.events.push(reward(1));
    expect(cursor.observe(state, 'p1')).toHaveLength(1);
    cursor.reset(); expect(cursor.observe(state, 'p1')).toEqual([]);
    state.roomCode = 'ROOM02'; state.events.push(reward(2));
    expect(cursor.observe(state, 'p1')).toEqual([]);
  });
});
