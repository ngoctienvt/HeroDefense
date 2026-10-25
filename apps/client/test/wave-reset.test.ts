import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../../../packages/contracts/src/types.js';
import { Battlefield } from '../src/battlefield.js';
import { createGame } from '../../../packages/game-core/src/state.js';

describe('wave snapshot VFX reset', () => {
  it('clears all effect systems once per boundary and skips finished-wave events even after a missed preparation snapshot', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const systems = ['tier6', 'tier3', 'tier4', 'effects', 'truongStatus', 'vothuong',
      'congcong', 'kimtra', 'moctra', 'thietphien', 'baoquatu', 'mandon', 'manhba',
      'ladongtan', 'nhiep', 'honghainhi', 'culinh'];
    const clearers = systems.map(() => vi.fn());
    const hero = { action: 'cast', dying: true, hitStop: .1, hitFlashTime: .2 };
    const monster = { dying: true }, clone = {};
    const disposeActorVisuals = vi.fn();
    Object.assign(battlefield, Object.fromEntries(systems.map((name, i) => [name, { clear: clearers[i] }])));
    Object.assign(battlefield, { eventId: 9, actors: new Map<string, object>([['hero', hero], ['monster', monster], ['clone', clone]]),
      groundEffects: [{}], summonedPlants: [{}], soulLinks: [{}], panguStatuses: [{}], disposeActorVisuals });
    const state = createGame('TEST01', 1);
    Object.assign(state, { phase: 'combat', wave: 2, combatResetEventId: 15,
      units: { hero: { id: 'hero' } } });
    const handle = battlefield as unknown as { syncCombatReset(state: GameState): void; eventId: number;
      groundEffects: unknown[]; summonedPlants: unknown[]; soulLinks: unknown[]; panguStatuses: unknown[];
      actors: Map<string, object> };
    handle.syncCombatReset(state);
    expect(handle.eventId).toBe(15);
    expect(hero).toMatchObject({ action: 'idle', dying: false, hitStop: 0, hitFlashTime: 0 });
    expect([...handle.actors.keys()]).toEqual(['hero']);
    expect(disposeActorVisuals).toHaveBeenCalledWith(monster);
    expect(disposeActorVisuals).toHaveBeenCalledWith(clone);
    expect(handle.groundEffects).toEqual([]); expect(handle.summonedPlants).toEqual([]);
    expect(handle.soulLinks).toEqual([]); expect(handle.panguStatuses).toEqual([]);
    handle.syncCombatReset(state);
    for (const clear of clearers) expect(clear).toHaveBeenCalledTimes(1);
    state.combatResetEventId = 30;
    handle.syncCombatReset(state);
    for (const clear of clearers) expect(clear).toHaveBeenCalledTimes(2);
    expect(handle.eventId).toBe(30);
  });
});
