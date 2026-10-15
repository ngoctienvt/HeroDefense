import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { Battlefield } from '../src/battlefield.js';

describe('battlefield ability feedback', () => {
  it('plays a cast cue before the impact event', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const showCast = vi.fn(), show = vi.fn(), play = vi.fn();
    const source = { root: { position: new Vector3(0, 0, 0) }, zone: 0 };
    Object.assign(battlefield, { actors: new Map([['source', source]]), effects: { showCast, show }, audio: { play }, zone: 0 });
    const cast: GameEvent = { id: 1, kind: 'cast', source: 'source', skillId: 'web-h00B', ability: 'chain', x: 2, z: 0 };
    (battlefield as unknown as { handleEvent: (event: GameEvent) => void }).handleEvent(cast);
    expect(showCast).toHaveBeenCalledWith(cast, source.root.position);
    expect(show).not.toHaveBeenCalled();
    expect(play).toHaveBeenCalledWith(cast);
  });

  it('shows defensive effects on every actual recipient', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const show = vi.fn();
    const play = vi.fn();
    const source = { root: { position: new Vector3(0, 0, 0), setEnabled: vi.fn() }, zone: 0, dying: false };
    const ally = { root: { position: new Vector3(5, 0, 2), setEnabled: vi.fn() }, zone: 0, dying: false };
    Object.assign(battlefield, { actors: new Map([['source', source], ['ally', ally]]), effects: { show }, audio: { play }, reducedMotion: { matches: true }, zone: 0 });
    const event: GameEvent = { id: 1, kind: 'ability', ability: 'heal', source: 'source', target: 'ally', targets: ['ally'], skillId: 'web-h00F' };
    (battlefield as unknown as { handleEvent: (event: GameEvent) => void }).handleEvent(event);
    expect(show).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledWith(event, ally.root.position, source.root.position, [ally.root.position]);
    expect(play).toHaveBeenCalledOnce();
  });
});
