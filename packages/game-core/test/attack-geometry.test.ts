import { describe, expect, it } from 'vitest';
import { HEROES, HERO_BY_ID } from '../../../content/catalog.js';
import { ATTACK_GEOMETRY_NAMES, MELEE_CLEAVE_SECONDARY, ON_HIT_TRAIT_NAMES } from '../../contracts/src/combat-profiles.js';
import type { AttackGeometryType, OnHitTraitType } from '../../contracts/src/types.js';
import { combatStep, hurtEnemy } from '../src/combat.js';
import { executeAttackGeometry, stepOrbitAuras, triggerFollowUp } from '../src/attack-geometry.js';
import { command, deployed, enemy, game } from './fixtures.js';

describe('Attack Geometries and On-Hit Traits coverage', () => {
  it('assigns a named Attack Geometry and On-Hit Trait to all 70 heroes', () => {
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
      'berserk',
      'pure_land',
      'moon_bounce',
      'poison',
      'soul_link',
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

  it('frontal_cleave: side targets take the melee-carry share, the primary takes full damage', () => {
    const state = game(), unit = deployed(state, 'h00O'); // Phán Quan: 180° sweep, no base crit
    const primary = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const side = enemy(state, unit, { x: unit.x + 1.5, z: unit.z + 1 });
    const outside = enemy(state, unit, { x: unit.x + 1, z: unit.z + 3 });

    executeAttackGeometry(state, unit, primary, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(primary.maxHp - primary.hp).toBeCloseTo(unit.attack, 5);
    expect(side.maxHp - side.hp).toBeCloseTo(unit.attack * MELEE_CLEAVE_SECONDARY, 5);
    expect(outside.hp).toBe(outside.maxHp);
  });

  it('frontal_cleave: early-tier sweeps (Quỷ Sai) give side targets 50%', () => {
    const state = game(), unit = deployed(state, 'h003');
    const primary = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const side = enemy(state, unit, { x: unit.x + 1.6, z: unit.z + .8 });

    executeAttackGeometry(state, unit, primary, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(side.maxHp - side.hp).toBeCloseTo((primary.maxHp - primary.hp) * .5, 5);
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
    const state = game(), unit = deployed(state, 'h00L'); // multishot
    const first = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const second = enemy(state, unit, { x: unit.x + 3, z: unit.z + 2 });
    const third = enemy(state, unit, { x: unit.x + 2.5, z: unit.z - 2 });

    executeAttackGeometry(state, unit, first, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(first.hp).toBeLessThan(first.maxHp);
    expect(second.hp).toBeLessThan(second.maxHp);
    expect(third.hp).toBeLessThan(third.maxHp);
  });

  it.each(['h005', 'h00M', 'h00N', 'h00G', 'h006', 'h00F', 'h00Y', 'h00K', 'h009', 'h00E', 'h03S'])(
    'single: %s no longer splashes, bounces or sweeps onto neighbours', (heroId) => {
      const state = game(), unit = deployed(state, heroId);
      const primary = enemy(state, unit, { x: unit.x + 1.5, z: unit.z });
      const neighbour = enemy(state, unit, { x: primary.x + .8, z: primary.z + .4 });

      executeAttackGeometry(state, unit, primary, (e, d, p) => hurtEnemy(state, unit, e, d, p));

      expect(HERO_BY_ID[heroId].attackGeometry?.type).toBe('single');
      expect(primary.hp).toBeLessThan(primary.maxHp);
      expect(neighbour.hp).toBe(neighbour.maxHp);
    });

  it('only melee carries keep a sweep; no basic attack splashes or uses a boomerang', () => {
    for (const hero of HEROES) {
      const type = hero.attackGeometry?.type;
      expect(type).not.toBe('impact_splash');
      expect(type).not.toBe('boomerang');
      if (type === 'frontal_cleave') expect(hero.carryPassive, hero.id).toBeDefined();
      if (hero.role === 'support' || hero.role === 'guardian') expect(type, hero.id).toBe('single');
    }
  });

  it('Ứng Long lances no longer burst around each struck target', () => {
    const state = game(), unit = deployed(state, 'h00Z');
    const primary = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const neighbour = enemy(state, unit, { x: primary.x + 1, z: primary.z });
    executeAttackGeometry(state, unit, primary, (e, d, p) => hurtEnemy(state, unit, e, d, p));
    // Each enemy takes exactly its own lance; the old 50% burst would add damage to both.
    expect(state.events.some(ev => ev.skillId === 'splash-h00Z')).toBe(false);
    expect(primary.maxHp - primary.hp).toBeCloseTo(unit.attack, 5);
    expect(neighbour.maxHp - neighbour.hp).toBeCloseTo(unit.attack, 5);
  });

  it('bounce: chains to nearby targets with damage reduction per bounce', () => {
    const state = game(), unit = deployed(state, 'h002'); // bounce
    const first = enemy(state, unit, { x: unit.x + 2, z: unit.z });
    const second = enemy(state, unit, { x: first.x + 2, z: first.z });

    executeAttackGeometry(state, unit, first, (e, d, p) => hurtEnemy(state, unit, e, d, p));

    expect(first.hp).toBeLessThan(first.maxHp);
    expect(second.hp).toBeLessThan(second.maxHp);
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
