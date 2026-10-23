import { describe, expect, it } from 'vitest';
import { deploymentPosition } from '../src/battlefield-layout.js';
import { resolveUnitCollisions, unitRadius, unitSpacingRadius } from '../src/crowd-movement.js';
import { walkUnitWithPathing } from '../src/unit-pathing.js';
import { deployed, game, summon } from './fixtures.js';

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

  it('routes a moving hero around a parked ally without moving the ally', () => {
    const state = game(1);
    const mover = deployed(state, 'h001', 0), parked = deployed(state, 'h002', 1);
    mover.x = 0; mover.z = 0; parked.x = 0; parked.z = 3;
    parked.stopped = true; parked.orderMode = 'hold';
    const parkedAt = { x: parked.x, z: parked.z };
    for (let tick = 0; tick < 100; tick++) {
      walkUnitWithPathing(mover, { x: 0, z: 8 }, .2, [mover, parked], []);
      expect(Math.hypot(mover.x - parked.x, mover.z - parked.z))
        .toBeGreaterThanOrEqual(unitSpacingRadius(mover) + unitSpacingRadius(parked) - .01);
    }
    expect(mover.z).toBeGreaterThan(5);
    expect({ x: parked.x, z: parked.z }).toEqual(parkedAt);
  });

  it('waits when both passing sides are occupied', () => {
    const state = game(1);
    const mover = deployed(state, 'h001', 0), front = deployed(state, 'h002', 1),
      left = deployed(state, 'h003', 2), right = deployed(state, 'h004', 3);
    mover.x = 0; mover.z = 0;
    front.x = 0; front.z = 3;
    left.x = -2.8; left.z = 1;
    right.x = 2.8; right.z = 1;
    const positions = [front, left, right].map(unit => ({ x: unit.x, z: unit.z }));
    walkUnitWithPathing(mover, { x: 0, z: 8 }, .2, [mover, front, left, right], []);
    expect(mover.z).toBeLessThanOrEqual(.2);
    expect([front, left, right].map(unit => ({ x: unit.x, z: unit.z }))).toEqual(positions);
  });
});
