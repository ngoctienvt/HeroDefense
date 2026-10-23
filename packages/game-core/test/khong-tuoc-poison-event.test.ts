import { describe, expect, it } from 'vitest';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { combatStep, hurtEnemy } from '../src/combat.js';
import { resolveTier3Ability } from '../src/tier3-combat.js';
import { deployed, enemy, game, summon } from './fixtures.js';

const SKILL = 'peacock-poison-hit-h03R';
describe('Khổng Tước presentation metadata follows actual combat', () => {
  it('keeps exact deployed same-owner R9 support recipients including caster and summons', () => {
    const state = game(), caster = deployed(state, 'h03R'); caster.x = caster.z = 0;
    const edge = deployed(state, 'h005', 1), outside = deployed(state, 'h003', 2), otherZone = deployed(state, 'h004', 3);
    const foreign = deployed(state, 'h005', 0, 'p2'), reserve = summon(state, 'h005'), summoned = summon(state, 'h005');
    for (const unit of [edge, outside, otherZone, foreign, reserve, summoned]) { unit.x = unit.z = 0; }
    edge.x = 9; outside.x = 9.01; otherZone.zone = 1; summoned.summonDuration = 3;
    edge.stun = 1; edge.hp = edge.maxHp / 2;
    const target = enemy(state, caster), before = target.hp;
    resolveTier3Ability(state, caster, { x: 20, z: 0 }, (e, d, p) => hurtEnemy(state, caster, e, d, p));
    const event = state.events.find(e => e.skillId === 'tier3-tier4-h03R');
    expect(event?.targets).toEqual([caster.id, edge.id, summoned.id]);
    expect(target.hp).toBe(before); expect(edge.stun).toBe(0); expect(edge.hp).toBeGreaterThan(edge.maxHp / 2);
    for (const ally of [caster, edge, summoned]) {
      expect(ally.tierBuff).toEqual({ kind: 'poison', remaining: 5 });
      expect(ally.haste).toEqual({ remaining: 5, amount: .3 });
    }
    for (const excluded of [outside, otherZone, foreign, reserve]) expect(excluded.tierBuff).toBeUndefined();
  });
  it('emits one auxiliary event for a real buff application without changing the ordinary attack', () => {
    const state = game(), unit = deployed(state, 'h005'), target = enemy(state, unit);
    unit.tierBuff = { remaining: 5, kind: 'poison' };
    executeAttackGeometry(state, unit, target, (e, d, p) => hurtEnemy(state, unit, e, d, p));
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(target.poison).toEqual({ remaining: 3, damagePerSecond: unit.attack * .15 / 3, casterId: unit.id });
    const accents = state.events.filter(e => e.skillId === SKILL);
    expect(accents).toHaveLength(1);
    expect(accents[0]).toMatchObject({ kind: 'trait', source: unit.id, target: target.id, targets: [target.id],
      x: target.x, z: target.z, zone: target.zone });
    expect(state.events.filter(e => e.kind === 'attack')).toHaveLength(1);
    expect(state.events.find(e => e.kind === 'attack')).toMatchObject({ skillId: 'trait-h005', value: unit.attack });
  });
  it('reports every actual cleave victim and never a nearby enemy outside its geometry', () => {
    const state = game(), unit = deployed(state, 'h003'); unit.x = unit.z = 0;
    unit.tierBuff = { kind: 'poison', remaining: 5 };
    const main = enemy(state, unit, { x: 1, z: 0 }), side = enemy(state, unit, { x: 1.2, z: .25 });
    const missed = enemy(state, unit, { x: -3, z: 0 });
    executeAttackGeometry(state, unit, main, (e, d, p) => hurtEnemy(state, unit, e, d, p));
    expect(state.events.filter(e => e.skillId === SKILL).map(e => e.target)).toEqual([main.id, side.id]);
    expect(main.poison).toBeDefined(); expect(side.poison).toBeDefined(); expect(missed.poison).toBeUndefined();
  });
  it('does not infer a buff from existing enemy poison, native poison, fire buffs, or custom early-return attacks', () => {
    for (const heroId of ['h005', 'h002', 'h013']) {
      const state = game(), unit = deployed(state, heroId), target = enemy(state, unit);
      target.poison = { remaining: 2, damagePerSecond: 7, casterId: 'previous' };
      if (heroId !== 'h005') unit.tierBuff = { kind: 'poison', remaining: 5 };
      executeAttackGeometry(state, unit, target, (e, d, p) => hurtEnemy(state, unit, e, d, p));
      expect(state.events.filter(e => e.skillId === SKILL)).toEqual([]);
      if (heroId === 'h002') expect(target.poison?.damagePerSecond).toBe(15);
    }
    const state = game(), unit = deployed(state, 'h005'), target = enemy(state, unit);
    unit.tierBuff = { kind: 'fire', remaining: 5 };
    executeAttackGeometry(state, unit, target, (e, d, p) => hurtEnemy(state, unit, e, d, p));
    expect(target.poison).toBeUndefined(); expect(state.events.some(e => e.skillId === SKILL)).toBe(false);
  });
  it('stops applications after the real status clock expires the buff', () => {
    const state = game(), unit = deployed(state, 'h005');
    unit.tierBuff = { kind: 'poison', remaining: .05 }; unit.cooldown = 100;
    combatStep(state, .1); expect(unit.tierBuff).toBeUndefined();
    const target = enemy(state, unit);
    executeAttackGeometry(state, unit, target, (e, d, p) => hurtEnemy(state, unit, e, d, p));
    expect(target.poison).toBeUndefined(); expect(state.events.some(e => e.skillId === SKILL)).toBe(false);
  });
});
