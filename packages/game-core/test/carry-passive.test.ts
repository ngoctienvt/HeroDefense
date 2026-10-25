import { describe, expect, it } from 'vitest';
import { HEROES, HERO_BY_ID } from '../../../content/catalog.js';
import { CARRY_STACK_SECONDS, HERO_CARRY_PASSIVES } from '../../contracts/src/carry-passives.js';
import { MELEE_CLEAVE_SECONDARY } from '../../contracts/src/combat-profiles.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { tickCarryPassives } from '../src/carry-passive.js';
import { basicAttack } from '../src/combat-traits.js';
import { hurtEnemy, hurtUnit } from '../src/combat.js';
import { attackInterval } from '../src/stats.js';
import { deployed, enemy, game } from './fixtures.js';

const strike = (state: GameState, unit: Unit, target: Enemy) =>
  basicAttack(state, unit, target, (hit, damage, penetration, source) =>
    hurtEnemy(state, source ?? unit, hit, damage, penetration));
const taken = (target: Enemy) => target.maxHp - target.hp;

describe('carry passive roster', () => {
  it('gives every melee sweeper and every listed carry a passive, and none to mages, supports or guardians', () => {
    for (const hero of HEROES) {
      if (hero.attackGeometry?.type === 'frontal_cleave') expect(hero.carryPassive, hero.id).toBeDefined();
      if (hero.role === 'mage' || hero.role === 'support' || hero.role === 'guardian')
        expect(hero.carryPassive, hero.id).toBeUndefined();
    }
    expect(Object.keys(HERO_CARRY_PASSIVES)).toHaveLength(33);
    for (const [id, passive] of Object.entries(HERO_CARRY_PASSIVES)) {
      expect(HERO_BY_ID[id].carryPassive).toEqual(passive);
      expect(HERO_BY_ID[id].trait?.description).toContain(passive.name);
    }
  });
});

describe('carry passive mechanics', () => {
  it('lifesteal heals from the primary target only, never from cleave neighbours', () => {
    const state = game(), unit = deployed(state, 'h00O'); // lifesteal 10%, execute 30%
    unit.hp = unit.maxHp - 5000;
    const primary = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const side = enemy(state, unit, { x: unit.x + 1.5, z: unit.z + 1 });
    strike(state, unit, primary);
    expect(taken(side)).toBeCloseTo(taken(primary) * MELEE_CLEAVE_SECONDARY, 5);
    expect(unit.hp).toBeCloseTo(unit.maxHp - 5000 + taken(primary) * .1, 5);
  });

  it('execute adds damage only below 30% HP of the primary target', () => {
    const state = game(), unit = deployed(state, 'h00O');
    const healthy = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    strike(state, unit, healthy);
    const baseHit = taken(healthy);
    delete state.enemies[healthy.id]; // keep the second swing from also sweeping it
    const low = enemy(state, unit, { x: unit.x + 2, z: unit.z + 20, hp: 20000, maxHp: 100000 });
    strike(state, unit, low);
    expect(20000 - low.hp).toBeCloseTo(baseHit * 1.3, 5);
  });

  it('fervor stacks attack speed up to its cap and drops after three idle seconds', () => {
    const state = game(), unit = deployed(state, 'h00A'); // +6% per stack, 5 stacks
    const target = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const base = attackInterval(state, unit);
    for (let n = 0; n < 7; n++) strike(state, unit, target);
    expect(unit.carryFervor?.stacks).toBe(5);
    const interval = HERO_BY_ID.h00A.interval;
    expect(attackInterval(state, unit)).toBeCloseTo(interval / (interval / base + .3), 5);
    tickCarryPassives(state, CARRY_STACK_SECONDS - .1);
    expect(unit.carryFervor?.stacks).toBe(5);
    tickCarryPassives(state, .2);
    expect(unit.carryFervor).toBeUndefined();
    expect(attackInterval(state, unit)).toBeCloseTo(base, 5);
  });

  it('focus grows on consecutive hits against one target and resets on a new target; bosses take extra', () => {
    const state = game(), unit = deployed(state, 'h01I'); // focus 5% x6, boss +25%
    const first = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const hits: number[] = [];
    for (let n = 0; n < 3; n++) {
      const before = first.hp;
      strike(state, unit, first);
      hits.push(before - first.hp);
    }
    expect(hits[1]).toBeCloseTo(hits[0] * 1.05, 5);
    expect(hits[2]).toBeCloseTo(hits[0] * 1.10, 5);
    const other = enemy(state, unit, { x: unit.x + 2, z: unit.z + 20 });
    strike(state, unit, other);
    expect(taken(other)).toBeCloseTo(hits[0], 5);
    const boss = enemy(state, unit, { kind: 'boss', x: unit.x + 2, z: unit.z - 20 });
    strike(state, unit, boss);
    expect(taken(boss)).toBeCloseTo(hits[0] * 1.25, 5);
  });

  it('long shot rewards distant primary targets', () => {
    const near = game(), farState = game();
    const nearUnit = deployed(near, 'h00M'), farUnit = deployed(farState, 'h00M'); // +15% from 6 units
    const close = enemy(near, nearUnit, { x: nearUnit.x + 3, z: nearUnit.z });
    const distant = enemy(farState, farUnit, { x: farUnit.x + 7, z: farUnit.z });
    strike(near, nearUnit, close);
    strike(farState, farUnit, distant);
    expect(taken(distant)).toBeCloseTo(taken(close) * 1.15, 5);
  });

  it('momentum grants attack speed after a basic attack kills its primary target', () => {
    const state = game(), unit = deployed(state, 'h00H'); // +25% for 3 s
    const victim = enemy(state, unit, { x: unit.x + 2, z: unit.z, hp: 1, maxHp: 1000 });
    strike(state, unit, victim);
    expect(state.enemies[victim.id]).toBeUndefined();
    expect(unit.carryMomentum).toEqual({ remaining: CARRY_STACK_SECONDS, amount: .25 });
    tickCarryPassives(state, CARRY_STACK_SECONDS + .01);
    expect(unit.carryMomentum).toBeUndefined();
  });

  it('crowd guard reduces damage taken only while three enemies are within three units', () => {
    const alone = game(), crowded = game();
    const lone = deployed(alone, 'h00P'), mobbed = deployed(crowded, 'h00P'); // -15%
    for (let n = 0; n < 3; n++) enemy(crowded, mobbed, { x: mobbed.x + 1, z: mobbed.z + n * .5 });
    enemy(alone, lone, { x: lone.x + 1, z: lone.z });
    hurtUnit(alone, lone, 1000);
    hurtUnit(crowded, mobbed, 1000);
    expect(mobbed.maxHp - mobbed.hp).toBeCloseTo((lone.maxHp - lone.hp) * .85, 5);
  });

  it('leaves non-carries untouched', () => {
    const state = game(), unit = deployed(state, 'h00N');
    const target = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    strike(state, unit, target);
    expect(unit.carryFervor).toBeUndefined();
    expect(unit.carryFocus).toBeUndefined();
    expect(taken(target)).toBeCloseTo(unit.attack, 5);
  });
});
