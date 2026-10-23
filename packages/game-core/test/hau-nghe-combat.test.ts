import { describe, expect, it } from 'vitest';
import { HAUNGHE as H } from '../../../content/hau-nghe-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Hậu Nghệ', () => {
  it('fires a 12-unit piercing solar arrow with one rage gain, crit, armor penetration and burn', () => {
    const state = game(), unit = deployed(state, H.id); state.seed = 1;
    expect(HERO_BY_ID[H.id]).toMatchObject({ hp: 3100, attack: 840, armor: 15,
      range: 11, interval: .9, speed: 3.8, element: 4 });
    const first = enemy(state, unit, { armor: 100 });
    const second = enemy(state, unit, { x: unit.x + 8, armor: 100 });
    const wide = enemy(state, unit, { x: unit.x + 7, z: unit.z + 2 });
    executeAttackGeometry(state, unit, first, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, damage, penetration));
    expect(unit.energy).toBe(18);
    expect(first.maxHp - first.hp).toBeCloseTo(840 * 2 * 100 / (100 + 65 * 5));
    expect(second.hp).toBeLessThan(second.maxHp);
    expect(second.burn).toMatchObject({ damagePerSecond: 180, remaining: 3 });
    expect(wide.hp).toBe(wide.maxHp);
    expect(state.events.at(-1)).toMatchObject({ skillId: 'trait-h017', isCrit: true,
      targets: [first.id, second.id] });
  });

  it('selects the highest-HP enemy for the nine suns and applies attack-scaled true burning', () => {
    const state = game(), unit = deployed(state, H.id); state.phase = 'combat'; unit.energy = 100;
    const small = enemy(state, unit, { hp: 100000, maxHp: 100000 });
    const boss = enemy(state, unit, { x: unit.x + 16, hp: 200000, maxHp: 200000, kind: 'boss', armor: 100 });
    const nearby = enemy(state, unit, { x: boss.x + 2, hp: 100000, maxHp: 100000 });
    const outside = enemy(state, unit, { x: boss.x + 8, hp: 100000, maxHp: 100000 });
    expect(castAbility(state, unit, small.id)).toBe(true);
    expect(state.events.at(-1)?.target).toBe(boss.id);
    unit.cooldown = 10; combatStep(state, .25);
    expect(boss.sunder).toMatchObject({ amount: .5, percent: true });
    // Same burn on a 200k boss and a 100k minion: it reads Công, never the target's Máu.
    expect(boss.burn).toMatchObject({ damagePerSecond: H.attack * H.burnPowerPerSecond, trueDamage: true });
    expect(nearby.burn).toMatchObject({ damagePerSecond: H.attack * H.burnPowerPerSecond, trueDamage: true });
    expect(outside.hp).toBe(outside.maxHp);
    expect(state.events.find(event => event.skillId === 'skill-h017')?.target).toBe(boss.id);
  });
});
