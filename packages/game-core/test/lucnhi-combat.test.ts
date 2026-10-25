import { describe, expect, it } from 'vitest';
import { LUCNHI as L } from '../../../content/lucnhi-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Lục Nhĩ Mỹ Hầu', () => {
  it('pierces in a six-unit line, crits at 2×, and adds true damage to sundered targets', () => {
    const state = game(), unit = deployed(state, L.id); state.seed = 1;
    expect(HERO_BY_ID[L.id]).toMatchObject({ hp: 7800, attack: 820, armor: 22,
      range: 3.5, interval: .7, speed: 5 });
    const front = enemy(state, unit, { armor: 100,
      sunder: { remaining: 3, amount: .2, percent: true } });
    const behind = enemy(state, unit, { x: unit.x + 4, armor: 100 });
    const side = enemy(state, unit, { x: unit.x + 4, z: unit.z + 4, armor: 100 });
    executeAttackGeometry(state, unit, front, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, damage, penetration));
    expect(state.events.find(event => event.skillId === 'trait-h03Y')?.isCrit).toBe(true);
    expect(unit.energy).toBe(16);
    expect(front.hp).toBeLessThan(behind.hp);
    expect(behind.hp).toBeLessThan(behind.maxHp);
    expect(side.hp).toBe(side.maxHp);
  });

  it('delivers six armor-piercing strikes to each target and cannot be selected during assault', () => {
    const state = game(), unit = deployed(state, L.id);
    state.phase = 'combat'; unit.energy = 100; unit.cooldown = 100;
    const first = enemy(state, unit, { hp: 100000, maxHp: 100000, armor: 200,
      attack: 1000, speed: 0 });
    const second = enemy(state, unit, { x: first.x + 2, hp: 100000,
      maxHp: 100000, armor: 200, attack: 0, speed: 0 });
    const outside = enemy(state, unit, { x: first.x + 8, hp: 100000,
      maxHp: 100000, attack: 0, speed: 0 });
    expect(castAbility(state, unit, first.id)).toBe(true);
    combatStep(state, .25);
    expect(unit.shadowAssault).toBeDefined();
    second.x += 20;
    const hpBefore = unit.hp;
    for (let n = 0; n < 5; n++) combatStep(state, .25);
    expect(unit.hp).toBe(hpBefore);
    combatStep(state, .25);
    expect(unit.shadowAssault).toBeUndefined();
    expect(first.maxHp - first.hp).toBeCloseTo(6 * L.attack * L.strikePower);
    expect(second.maxHp - second.hp).toBeCloseTo(6 * L.attack * L.strikePower);
    expect(outside.hp).toBe(outside.maxHp);
    expect(first.sunder?.amount).toBe(.5);
    expect(first.critVulnerability?.amount).toBe(.3);
    expect(state.events.filter(event => event.skillId === 'shadow-hit-h03Y')).toHaveLength(6);
  });

  it('lets an allied critical attack exploit the exposed-point debuff', () => {
    const state = game(), attacker = deployed(state, 'h001'); state.seed = 1;
    const target = enemy(state, attacker, { armor: 0,
      critVulnerability: { remaining: 5, amount: .3 } });
    executeAttackGeometry(state, attacker, target, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? attacker, hit, damage, penetration));
    expect(state.events.find(event => event.skillId === 'trait-h001')?.isCrit).toBe(true);
    expect(target.maxHp - target.hp).toBeCloseTo(attacker.attack * 1.75 * 1.3);
  });
});
