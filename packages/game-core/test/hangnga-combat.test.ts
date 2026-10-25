import { describe, expect, it } from 'vitest';
import { HANGNGA as H } from '../../../content/hangnga-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, forceControl, game } from './fixtures.js';

describe('Hằng Nga', () => {
  it('strikes one enemy with moonlight and slows its movement and attacks', () => {
    const state = game(), unit = deployed(state, H.id);
    expect(HERO_BY_ID[H.id]).toMatchObject({ hp: 3600, attack: 580, armor: 18,
      range: 8, interval: 1, speed: 4, element: 3 });
    const first = enemy(state, unit), second = enemy(state, unit, { x: unit.x + 3 });
    const third = enemy(state, unit, { x: unit.x + 5 });
    const fourth = enemy(state, unit, { x: unit.x + 7 });
    const far = enemy(state, unit, { x: unit.x + 15 });
    executeAttackGeometry(state, unit, first, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, damage, penetration));
    expect(first.maxHp - first.hp).toBeCloseTo(580);
    expect(first.slowStrength).toBe(.4);
    expect(first.attackSlow?.strength).toBe(.4);
    // Supports attack one target: the moonbeam no longer bounces.
    for (const untouched of [second, third, fourth, far]) expect(untouched.hp).toBe(untouched.maxHp);
    expect(state.events.at(-1)?.targets).toEqual([first.id]);
  });

  it('heals and shields nearby allies and freezes slowed enemies only in her own area', () => {
    const state = game(), unit = deployed(state, H.id), ally = deployed(state, 'h011', 1);
    state.phase = 'combat'; ally.x = unit.x + 2; ally.z = unit.z;
    ally.hp -= 1000;
    const slowed = enemy(state, unit, { slow: 3, slowStrength: .4 });
    const distantZone = enemy(state, unit, { zone: 1, slow: 3, slowStrength: .4 });
    const plain = enemy(state, unit, { x: unit.x + 20 });
    expect(castAbility(state, unit)).toBe(true);
    unit.cooldown = 10; ally.cooldown = 10; combatStep(state, .25);
    expect(ally.hp).toBe(ally.maxHp);
    expect(ally.shield).toBe(580 * 3.4);
    // Energy/cooldown support belongs to Bồ Đề and Chúc Long now.
    expect(ally.haste).toBeUndefined();
    expect(slowed.frozen).toBeGreaterThan(0);
    expect(distantZone.frozen ?? 0).toBe(0);
    expect(plain.frozen ?? 0).toBe(0);
    expect(state.events.find(e => e.skillId === 'freeze-h018')?.targets).toEqual([slowed.id]);
  });

  it('lists only enemies whose freeze roll succeeded', () => {
    const state = game(), unit = deployed(state, H.id), ally = deployed(state, 'h011', 1);
    state.phase = 'combat'; ally.x = unit.x + 2; ally.z = unit.z; ally.hp -= 1000;
    forceControl(state, 0);
    const slowed = enemy(state, unit, { slow: 3, slowStrength: .4 });
    expect(castAbility(state, unit)).toBe(true);
    unit.cooldown = 10; ally.cooldown = 10; combatStep(state, .25);
    expect(slowed.frozen ?? 0).toBe(0);
    expect(state.events.find(e => e.skillId === 'freeze-h018')?.targets).toEqual([]);
  });
});
