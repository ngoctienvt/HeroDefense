import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { XINGTIAN as X } from '../../../content/xingtian-design.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { attackInterval } from '../src/stats.js';
import { deployed, enemy, game } from './fixtures.js';

function setup() {
  const state = game(), unit = deployed(state, X.id);
  const hurt = (target: ReturnType<typeof enemy>, damage: number, penetration = 0) =>
    hurtEnemy(state, unit, target, damage, penetration);
  return { state, unit, hurt };
}

describe('Hình Thiên Vũ Can Thích', () => {
  it('uses the supplied stats and cleaves the front with burn and one rage gain', () => {
    const { state, unit, hurt } = setup();
    expect(HERO_BY_ID[X.id]).toMatchObject({ hp: 9800, attack: 720, armor: 28,
      range: 2.8, interval: .85, speed: 4.5 });
    const front = enemy(state, unit), side = enemy(state, unit, { x: unit.x + 2, z: unit.z + 2 });
    const behind = enemy(state, unit, { x: unit.x - 1 });
    executeAttackGeometry(state, unit, front, hurt);
    expect(unit.energy).toBe(14);
    expect(front.burn).toMatchObject({ damagePerSecond: 150, remaining: 3, casterId: unit.id });
    expect(side.hp).toBeLessThan(side.maxHp);
    expect(behind.hp).toBe(behind.maxHp);
    expect(state.events.at(-1)).toMatchObject({ skillId: 'trait-h011', targets: [front.id, side.id] });
  });

  it('scales speed and physical lifesteal at complete missing health tenths', () => {
    const { state, unit, hurt } = setup(); unit.hp = unit.maxHp * .5;
    const target = enemy(state, unit);
    expect(attackInterval(state, unit)).toBeCloseTo(.85 / 1.6);
    executeAttackGeometry(state, unit, target, hurt);
    expect(unit.hp).toBeCloseTo(unit.maxHp * .5 + 720 * .4);
  });

  it('uses a caster-centered radius, 2x conditional crit, pull and five-second immortality', () => {
    const { state, unit } = setup(); state.phase = 'combat'; unit.energy = 100;
    const target = enemy(state, unit, { x: unit.x + 2, stun: 1 });
    const plain = enemy(state, unit, { x: unit.x + 5 });
    const far = enemy(state, unit, { x: unit.x + 6.2 });
    expect(castAbility(state, unit, target.id)).toBe(true);
    expect(state.events.at(-1)).toMatchObject({ kind: 'cast', x: unit.x, z: unit.z });
    unit.cooldown = 10; combatStep(state, .25);
    expect(target.maxHp - target.hp).toBeCloseTo(720 * 4.2 * 2);
    expect(plain.maxHp - plain.hp).toBeCloseTo(720 * 4.2);
    expect(far.hp).toBe(far.maxHp);
    expect(target.x).toBeCloseTo(unit.x + 1.5);
    expect(unit.berserk).toMatchObject({ remaining: 5, attackSpeed: .8, immortal: true });
    expect(state.events.find(e => e.skillId === 'skill-h011')).toMatchObject({
      kind: 'ability', x: unit.x, z: unit.z, targets: [target.id, plain.id],
    });
    hurtEnemy(state, unit, target, 100000);
    const attacker = enemy(state, unit, { x: unit.x, z: unit.z, attack: 100000, target: unit.id });
    combatStep(state, .05);
    expect(unit.hp).toBe(1);
    delete state.enemies[attacker.id]; unit.cooldown = 10;
    combatStep(state, 5);
    expect(unit.berserk).toBeUndefined();
  });

  it('adds an armor-piercing fire wave on berserk attacks', () => {
    const { state, unit, hurt } = setup();
    unit.berserk = { remaining: 5, attackSpeed: .8, lifesteal: 0, immortal: true };
    const target = enemy(state, unit, { armor: 100 });
    const waveOnly = enemy(state, unit, { x: unit.x + 5, armor: 100 });
    executeAttackGeometry(state, unit, target, hurt);
    expect(waveOnly.maxHp - waveOnly.hp).toBeCloseTo(720 * .5);
    expect(state.events.at(-1)).toMatchObject({ skillId: 'fire-wave-h011', targets: [target.id, waveOnly.id] });
  });
});
