import { describe, expect, it } from 'vitest';
import { deployed, game } from '../../../packages/game-core/test/fixtures.js';
import { Selection } from '../src/selection.js';

describe('squad portrait focus', () => {
  it('changes the primary detail target without dropping selected group members', () => {
    const state = game(2);
    const first = deployed(state);
    const second = deployed(state, undefined, 1);
    const otherOwner = deployed(state, undefined, 0, 'p2');
    const selection = new Selection();
    selection.set([first.id, second.id], state, 'p1', 0);
    selection.focus(second.id, state, 'p1', 0);
    expect(selection.ids).toEqual([first.id, second.id]);
    selection.focus(otherOwner.id, state, 'p1', 0);
    expect(selection.ids).toEqual([first.id, second.id]);
    selection.focus(first.id, state, 'p1', 0);
    expect(selection.ids).toEqual([first.id, second.id]);
  });
});
