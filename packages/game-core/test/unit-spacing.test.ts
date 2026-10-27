import { describe, expect, it } from 'vitest';
import { deploymentPosition } from '../src/battlefield-layout.js';
import { contactDistance, enemySpacingRadius, resolveSoftCollisions, resolveUnitCollisions, unitRadius, unitSpacingRadius } from '../src/crowd-movement.js';
import { walkEnemyWithPathing, walkUnitWithPathing } from '../src/unit-pathing.js';
import { deployed, enemy, game, summon } from './fixtures.js';

describe('unit spacing', () => {
  it('keeps deployment slots distinct for one to four players', () => {
    for (let players = 1; players <= 4; players++) {
      const positions = Array.from({ length: players * 5 }, (_, index) =>
        deploymentPosition(players, Math.floor(index / 5), index % 5));
      for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) {
        expect(Math.hypot(positions[i].x - positions[j].x, positions[i].z - positions[j].z))
          .toBeGreaterThanOrEqual(3.1);
      }
    }
  });

  it('separates overlapping deployed heroes in the same zone', () => {
    const state = game(1);
    const first = deployed(state, 'h001', 0), second = deployed(state, 'h002', 1);
    first.x = second.x = 0; first.z = second.z = 0;
    for (let i = 0; i < 20; i++) resolveUnitCollisions([first, second]);
    expect(Math.hypot(first.x - second.x, first.z - second.z))
      .toBeGreaterThanOrEqual(unitRadius(first) + unitRadius(second));
    second.zone = 1; first.x = second.x = 0; first.z = second.z = 0;
    resolveUnitCollisions([first, second]);
    expect(first.x).toBe(0);
    expect(second.x).toBe(0);
  });

  it('includes summoned units in the same spacing rule', () => {
    const state = game(1), hero = deployed(state, 'h001');
    const tree = summon(state, 'h001');
    tree.summonKind = 'ancient-tree'; tree.summonDuration = 5;
    tree.stopped = true;
    tree.x = hero.x; tree.z = hero.z;
    const treePosition = { x: tree.x, z: tree.z };
    resolveUnitCollisions([hero, tree]);
    expect(Math.hypot(hero.x - tree.x, hero.z - tree.z)).toBeGreaterThan(0);
    expect({ x: tree.x, z: tree.z }).toEqual(treePosition);
  });

  it('walks straight through a parked ally without displacing it', () => {
    const state = game(1), mover = deployed(state, 'h001', 0), parked = deployed(state, 'h002', 1);
    mover.x = 0; mover.z = 0; parked.x = 0; parked.z = 3;
    parked.stopped = true; parked.orderMode = 'hold';
    let crossed = false;
    for (let tick = 0; tick < 40; tick++) {
      walkUnitWithPathing(mover, { x: 0, z: 8 }, .2, [mover, parked], []);
      resolveUnitCollisions([mover, parked], new Set([mover.id]));
      crossed ||= Math.hypot(mover.x - parked.x, mover.z - parked.z) < .1;
      expect(mover.x).toBe(0);
      expect({ x: parked.x, z: parked.z }).toEqual({ x: 0, z: 3 });
    }
    expect(crossed).toBe(true);
    expect(mover.z).toBeCloseTo(8);
  });

  it('crosses either faction and reserves a free standing position at an occupied destination', () => {
    const state = game(1), hero = deployed(state, 'h001');
    hero.x = 0; hero.z = 0;
    const foe = enemy(state, hero, { x: 0, z: 3 });
    let crossed = false, arrived = false;
    for (let tick = 0; tick < 80 && !arrived; tick++) {
      arrived = walkUnitWithPathing(hero, { x: 0, z: 6 }, .2, [hero], [foe]);
      resolveSoftCollisions([foe], [hero], new Set(), new Set([hero.id]));
      crossed ||= Math.abs(hero.z - foe.z) < .1;
    }
    expect(crossed).toBe(true);
    expect(arrived).toBe(true);
    expect(foe.z).toBe(3);
    arrived = false;
    for (let tick = 0; tick < 80 && !arrived; tick++)
      arrived = walkUnitWithPathing(hero, foe, .2, [hero], [foe]);
    expect(arrived).toBe(true);
    expect(Math.hypot(hero.x - foe.x, hero.z - foe.z)).toBeGreaterThanOrEqual(contactDistance(hero, foe));
  });

  it('lets a monster cross heroes and monsters, then settles apart', () => {
    const state = game(1), hero = deployed(state, 'h001');
    hero.x = 0; hero.z = 2;
    const mover = enemy(state, hero, { x: 0, z: 0 });
    const parked = enemy(state, hero, { x: 0, z: 4 });
    let crossedHero = false, crossedEnemy = false;
    for (let tick = 0; tick < 30; tick++) {
      walkEnemyWithPathing(mover, { x: 0, z: 6 }, .2, [hero], [mover, parked]);
      resolveSoftCollisions([mover, parked], [hero], new Set([parked.id]), new Set([mover.id]));
      crossedHero ||= Math.abs(mover.z - hero.z) < .1;
      crossedEnemy ||= Math.abs(mover.z - parked.z) < .1;
      expect(mover.x).toBe(0);
    }
    expect(crossedHero && crossedEnemy).toBe(true);
    expect(parked.z).toBe(4);
    mover.x = parked.x; mover.z = parked.z;
    for (let tick = 0; tick < 20; tick++) resolveSoftCollisions([mover, parked]);
    expect(Math.hypot(mover.x - parked.x, mover.z - parked.z))
      .toBeGreaterThanOrEqual(enemySpacingRadius(mover) + enemySpacingRadius(parked));
  });

  it('stops beside an ally at a compact distance and rejects invalid movement amounts', () => {
    const state = game(1), mover = deployed(state, 'h001', 0), parked = deployed(state, 'h002', 1);
    mover.x = 0; mover.z = 0; parked.x = 0; parked.z = 3;
    let arrived = false;
    for (let tick = 0; tick < 80 && !arrived; tick++)
      arrived = walkUnitWithPathing(mover, parked, .2, [mover, parked], []);
    expect(arrived).toBe(true);
    const gap = Math.hypot(mover.x - parked.x, mover.z - parked.z);
    expect(gap).toBeGreaterThanOrEqual(unitSpacingRadius(mover) + unitSpacingRadius(parked));
    expect(gap).toBeLessThan(1.7);
    const before = { x: mover.x, z: mover.z };
    for (const amount of [NaN, Infinity, -1, 0])
      expect(walkUnitWithPathing(mover, { x: 0, z: 8 }, amount, [mover, parked], [])).toBe(false);
    expect({ x: mover.x, z: mover.z }).toEqual(before);
  });
});
