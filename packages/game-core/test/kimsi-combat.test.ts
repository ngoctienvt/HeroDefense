import { describe, expect, it } from 'vitest';
import { KIMSI as K } from '../../../content/kimsi-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Kim Sí Đại Bằng', () => {
  it('strikes twice, stacks armor cuts, refreshes bleed, and gains rage per strike', () => {
    const state = game(), unit = deployed(state, K.id); state.seed = 1;
    expect(HERO_BY_ID[K.id]).toMatchObject({ hp: 8400, attack: 790, armor: 24,
      range: 3, interval: .65, speed: 5.2, block: 10 });
    const front = enemy(state, unit, { armor: 40 });
    const side = enemy(state, unit, { x: unit.x + 2, z: unit.z + 1, armor: 40 });
    const rear = enemy(state, unit, { x: unit.x - 1, armor: 40 });
    executeAttackGeometry(state, unit, front, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, damage, penetration));
    expect(unit.energy).toBe(24);
    expect(front.armorCuts).toMatchObject({ amount: 8, remaining: 3 });
    expect(front.bleed).toMatchObject({ damagePerSecond: 150, casterId: unit.id });
    expect(front.maxHp - front.hp).toBeGreaterThan(790 * 100 / 300);
    expect(side.armorCuts?.amount).toBe(8);
    expect(rear.hp).toBe(rear.maxHp);
    expect(state.events.filter(event => event.skillId === 'trait-h016')).toHaveLength(2);
  });

  it('rains armor-piercing feathers, then grants attack speed and crit chance', () => {
    const state = game(), unit = deployed(state, K.id);
    state.phase = 'combat'; unit.energy = 100; unit.cooldown = 10;
    const inside = enemy(state, unit, { armor: 100, x: unit.x + 5 });
    const outside = enemy(state, unit, { armor: 100, x: unit.x + 7 });
    expect(castAbility(state, unit, inside.id)).toBe(true);
    combatStep(state, .25);
    expect(inside.maxHp - inside.hp).toBeCloseTo(K.attack * K.stormPower);
    expect(inside.bleed).toMatchObject({ damagePerSecond: 150 });
    expect(outside.hp).toBe(outside.maxHp);
    expect(unit.berserk).toMatchObject({ attackSpeed: 1, critChance: .35 });
    expect(state.events.find(event => event.skillId === 'skill-h016')?.targets).toContain(inside.id);
  });
});
