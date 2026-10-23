import { describe, expect, it } from 'vitest';
import { castAbility, combatStep } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

/** Cự Linh Thần's hammer quake slows nearby enemies; the `quake-h00E` event tells clients which ones. */
describe('Cự Linh Thần quake event', () => {
  it('lists exactly the enemies within 3.0 that the quake slowed', () => {
    const state = game(), unit = deployed(state, 'h00E');
    state.phase = 'combat';
    const near = enemy(state, unit, { x: unit.x + 1.5, z: unit.z, attack: 0, speed: 0 });
    const far = enemy(state, unit, { x: unit.x + 4.2, z: unit.z, attack: 0, speed: 0 });
    unit.energy = unit.maxEnergy ?? 100;
    unit.abilityCooldown = 0;
    expect(castAbility(state, unit, near.id)).toBe(true);
    for (let step = 0; step < 5; step++) combatStep(state, .1);
    const quake = state.events.find(event => event.skillId === 'quake-h00E');
    expect(quake).toBeDefined();
    expect(quake?.source).toBe(unit.id);
    expect(quake?.targets).toEqual([near.id]);
    expect(quake?.value).toBe(3);
    expect(far.slow).toBeLessThanOrEqual(0);
  });
});
