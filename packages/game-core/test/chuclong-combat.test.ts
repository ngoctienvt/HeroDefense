import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { CHUCLONG as C } from '../../../content/chuclong-design.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Chúc Long', () => {
  it('breath pierces its 10 by 2.8 strip and applies true burn and sunder', () => {
    const state = game(), unit = deployed(state, C.id);
    state.phase = 'combat';
    const focus = enemy(state, unit, { x: unit.x + 4, z: unit.z, hp: 100000,
      maxHp: 100000, armor: 100, speed: 0, attack: 0 });
    const within = enemy(state, unit, { x: unit.x + 7, z: unit.z + 1,
      hp: 100000, maxHp: 100000, armor: 100, speed: 0, attack: 0 });
    const outside = enemy(state, unit, { x: unit.x + 7, z: unit.z + 2,
      hp: 100000, maxHp: 100000, armor: 100, speed: 0, attack: 0 });
    executeAttackGeometry(state, unit, focus, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, damage, penetration));
    expect(HERO_BY_ID[C.id]).toMatchObject({ hp: 8600, attack: 1280,
      armor: 27, range: 8.5, interval: 1.05, speed: 4 });
    expect(within.hp).toBeLessThan(within.maxHp);
    expect(outside.hp).toBe(outside.maxHp);
    expect(within.burn?.damagePerSecond).toBe(350);
    expect(within.burn?.trueDamage).toBe(true);
    expect(within.sunder?.amount).toBe(.3);
  });

  it('freezes the lane, then detonates after 1.5 seconds with true fire and a cooldown gift', () => {
    const state = game(), unit = deployed(state, C.id), ally = deployed(state, 'h011', 1);
    state.phase = 'combat'; unit.cooldown = 100; ally.cooldown = 100;
    ally.abilityCooldown = 6;
    const victim = enemy(state, unit, { x: unit.x + 5, hp: 100000,
      maxHp: 100000, armor: 999, speed: 0, attack: 0 });
    const winterHp = victim.hp;
    expect(castAbility(state, unit, victim.id)).toBe(true);
    expect(victim.hp).toBeLessThan(winterHp);
    expect(victim.stun).toBeGreaterThanOrEqual(2.5);
    expect(victim.frozen).toBeGreaterThanOrEqual(2.5);
    expect(ally.abilityCooldown).toBe(3);
    expect(state.solarPhases).toHaveLength(1);
    combatStep(state, 1.4);
    expect(state.solarPhases).toHaveLength(1);
    const beforeSummer = victim.hp;
    combatStep(state, .11);
    expect(state.solarPhases).toHaveLength(0);
    expect(victim.hp).toBeLessThan(beforeSummer - C.attack * C.summerPower + 1);
    expect(victim.burn?.damagePerSecond).toBeCloseTo(C.attack * C.summerBurnPower / C.summerBurnSeconds);
    expect(state.events.some(event => event.skillId === 'summer-h01K')).toBe(true);
  });
});
