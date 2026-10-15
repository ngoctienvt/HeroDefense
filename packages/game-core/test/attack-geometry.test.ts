import { describe, expect, it } from 'vitest';
import { HEROES, HERO_BY_ID } from '../../../content/catalog.js';
import { ATTACK_GEOMETRY_NAMES, ON_HIT_TRAIT_NAMES } from '../../contracts/src/combat-profiles.js';
import type { AttackGeometryType, OnHitTraitType } from '../../contracts/src/types.js';
import { combatStep, hurtEnemy } from '../src/combat.js';
import { executeAttackGeometry, stepBoomerangs, stepOrbitAuras, triggerFollowUp } from '../src/attack-geometry.js';
import { command, deployed, enemy, game } from './fixtures.js';

describe('Attack Geometries and On-Hit Traits coverage', () => {
  it('assigns 1 of 7 Attack Geometries and 1 of 6 On-Hit Traits to all 70 heroes', () => {
    expect(HEROES).toHaveLength(70);

    const validGeometries: AttackGeometryType[] = [
      'single',
      'frontal_cleave',
      'linear_pierce',
      'multishot',
      'impact_splash',
      'bounce',
      'boomerang',
    ];

    const validTraits: OnHitTraitType[] = [
      'crit_pierce',
      'nth_strike',
      'double_strike',
      'stacking_mark',
      'orbit_aura',
      'follow_up',
    ];

    for (const hero of HEROES) {
      expect(hero.attackGeometry).toBeDefined();
      expect(validGeometries).toContain(hero.attackGeometry!.type);
      expect(ATTACK_GEOMETRY_NAMES[hero.attackGeometry!.type]).toBeTruthy();

      expect(hero.onHitTrait).toBeDefined();
      expect(validTraits).toContain(hero.onHitTrait!.type);
      expect(ON_HIT_TRAIT_NAMES[hero.onHitTrait!.type]).toBeTruthy();
    }
  });
});

describe('Attack Geometries mechanics', () => {
  it('single: focuses damage on one target only', () => {
    const state = game(), unit = deployed(state, 'h001'); // h001 has single
    const target = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const bystander = enemy(state, unit, { x: unit.x + 2, z: unit.z + 1 });

    executeAttackGeometry(state, unit, target, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(target.hp).toBeLessThan(target.maxHp);
    expect(bystander.hp).toBe(bystander.maxHp);
  });

  it('frontal_cleave: sweeps 180 degrees in front and ignores enemies behind', () => {
    const state = game(), unit = deployed(state, 'h003'); // frontal_cleave
    // Target is in front (+x)
    const inFront = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const inFrontDiagonal = enemy(state, unit, { x: unit.x + 1.5, z: unit.z + 1 });
    const behind = enemy(state, unit, { x: unit.x - 2, z: unit.z });

    executeAttackGeometry(state, unit, inFront, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(inFront.hp).toBeLessThan(inFront.maxHp);
    expect(inFrontDiagonal.hp).toBeLessThan(inFrontDiagonal.maxHp);
    expect(behind.hp).toBe(behind.maxHp);
  });

  it('linear_pierce: damages all enemies aligned in a row along the shot', () => {
    const state = game(), unit = deployed(state, 'h004'); // linear_pierce
    const target = enemy(state, unit, { x: unit.x + 3, z: unit.z });
    const alignedBehind = enemy(state, unit, { x: unit.x + 6, z: unit.z });
    const farOffSide = enemy(state, unit, { x: unit.x + 3, z: unit.z + 4 });

    executeAttackGeometry(state, unit, target, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(target.hp).toBeLessThan(target.maxHp);
    expect(alignedBehind.hp).toBeLessThan(alignedBehind.maxHp);
    expect(farOffSide.hp).toBe(farOffSide.maxHp);
  });

  it('multishot: fires at multiple targets in range simultaneously', () => {
    const state = game(), unit = deployed(state, 'h00M'); // multishot
    const first = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const second = enemy(state, unit, { x: unit.x + 3, z: unit.z + 2 });
    const third = enemy(state, unit, { x: unit.x + 2.5, z: unit.z - 2 });

    executeAttackGeometry(state, unit, first, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(first.hp).toBeLessThan(first.maxHp);
    expect(second.hp).toBeLessThan(second.maxHp);
    expect(third.hp).toBeLessThan(third.maxHp);
  });

  it('impact_splash: explodes around primary target, damaging nearby enemies', () => {
    const state = game(), unit = deployed(state, 'h005'); // impact_splash
    const primary = enemy(state, unit, { x: unit.x + 3, z: unit.z });
    const nearby = enemy(state, unit, { x: primary.x + 1, z: primary.z + 0.5 });
    const distant = enemy(state, unit, { x: primary.x + 8, z: primary.z });

    executeAttackGeometry(state, unit, primary, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(nearby.hp).toBeLessThan(nearby.maxHp);
    expect(distant.hp).toBe(distant.maxHp);
  });

  it('bounce: chains to nearby targets with damage reduction per bounce', () => {
    const state = game(), unit = deployed(state, 'h002'); // bounce
    const first = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const second = enemy(state, unit, { x: first.x + 2, z: first.z });

    executeAttackGeometry(state, unit, first, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(first.hp).toBeLessThan(first.maxHp);
    expect(second.hp).toBeLessThan(second.maxHp);
  });

  it('boomerang: cuts outward on throw and returns to cut enemies a second time', () => {
    const state = game(), unit = deployed(state, 'h00B'); // boomerang
    const target = enemy(state, unit, { x: unit.x + 3, z: unit.z });

    executeAttackGeometry(state, unit, target, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(state.boomerangs).toBeDefined();
    expect(state.boomerangs!.length).toBeGreaterThan(0);
    const hpAfterOutward = target.hp;
    expect(hpAfterOutward).toBeLessThan(target.maxHp);

    // Step boomerang return
    stepBoomerangs(state, 0.3, (u, e, d, p) => hurtEnemy(state, u, e, d, p));

    expect(target.hp).toBeLessThan(hpAfterOutward);
    expect(state.boomerangs!.length).toBe(0);
  });
});

describe('On-Hit & Passive Traits mechanics', () => {
  it('stacking_mark: increases damage and detonates at 5 stacks', () => {
    const state = game(), unit = deployed(state, 'h00M'); // stacking_mark
    const target = enemy(state, unit, { hp: 10000, maxHp: 10000 });

    for (let i = 1; i <= 4; i++) {
      executeAttackGeometry(state, unit, target, (e, d, p) => hurtEnemy(state, unit, e, d, p));
      expect(target.markStacks?.[unit.id]).toBe(i);
    }

    const hpBefore5th = target.hp;
    executeAttackGeometry(state, unit, target, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    // 5th hit detonates, dealing large bonus damage and clearing stacks
    expect(target.markStacks?.[unit.id]).toBe(0);
    expect(hpBefore5th - target.hp).toBeGreaterThan(unit.attack * 1.5);
    expect(state.events.some(ev => ev.text === 'Kích Nổ Ấn')).toBe(true);
  });

  it('orbit_aura: periodically damages and slows close enemies every 0.5s', () => {
    const state = game(), unit = deployed(state, 'h007'); // orbit_aura (ice)
    const closeEnemy = enemy(state, unit, { x: unit.x + 1.5, z: unit.z });

    stepOrbitAuras(state, 0.25, (u, e, d, p) => hurtEnemy(state, u, e, d, p));
    expect(closeEnemy.hp).toBe(closeEnemy.maxHp); // not yet 0.5s

    stepOrbitAuras(state, 0.3, (u, e, d, p) => hurtEnemy(state, u, e, d, p));
    expect(closeEnemy.hp).toBeLessThan(closeEnemy.maxHp);
    expect(closeEnemy.slow).toBeGreaterThan(0);
  });

  it('follow_up: automatically assists with a free basic attack when adjacent ally casts skill', () => {
    const state = game();
    const allyCaster = deployed(state, 'h00A', 0); // Mộc Tra (active ability)
    const assistHero = deployed(state, 'h03O', 1); // Nhiếp Tiểu Thiến (follow_up)
    assistHero.x = allyCaster.x + 2;
    assistHero.z = allyCaster.z;

    const target = enemy(state, allyCaster, { x: allyCaster.x + 2, z: allyCaster.z + 1 });
    const targetInitialHp = target.hp;

    // Trigger follow up
    triggerFollowUp(state, allyCaster, target, 'skill', (u, e, d, p) => hurtEnemy(state, u, e, d, p));

    expect(state.events.some(ev => ev.text === 'Hiệp Kích')).toBe(true);
    expect(target.hp).toBeLessThan(targetInitialHp);
  });
});
