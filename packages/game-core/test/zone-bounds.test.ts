import { describe, expect, it } from 'vitest';
import { ARENA, BOSS_SPAWN, clampToZone, withinArena, withinZone } from '../src/battlefield-layout.js';
import { handleCommand } from '../src/commands.js';
import { knockEnemyBack } from '../src/combat-status.js';
import { retreatFromTarget } from '../src/crowd-movement.js';
import { walkUnitWithPathing } from '../src/unit-pathing.js';
import { deployed, enemy, game } from './fixtures.js';

describe('zone bounds', () => {
  it('keeps zone 0 identical to the arena rectangle and places BOSS_SPAWN inside', () => {
    for (const [x, z] of [[0, 0], [44, 28], [44.1, 0], [-44, -36], [0, 28.1], [NaN, 0]]) {
      expect(withinZone(0, x, z)).toBe(withinArena(x, z));
    }
    expect(withinArena(BOSS_SPAWN.x, BOSS_SPAWN.z)).toBe(true);
    expect(clampToZone(0, { x: 99, z: -99 })).toEqual({ x: ARENA.maxX, z: ARENA.minZ });
  });

  it('stops a unit at the arena edge instead of crossing it', () => {
    const state = game(), unit = deployed(state);
    unit.x = 0; unit.z = 7;
    for (let i = 0; i < 200; i++) walkUnitWithPathing(unit, { x: 60, z: 7 }, 1, [], []);
    expect(unit.x).toBeLessThanOrEqual(ARENA.maxX + 1e-6);
    expect(unit.x).toBeGreaterThan(ARENA.maxX - 2);
  });

  it('keeps group formation offsets inside the arena', () => {
    const state = game(), unit = deployed(state), other = deployed(state, undefined, 1);
    const result = handleCommand(state, 'p1', { type: 'order', unitIds: [unit.id, other.id], order: 'move', x: ARENA.maxX - .5, z: -2 });
    expect(result.ok).toBe(true);
    for (const u of [unit, other]) expect(withinZone(0, u.destination!.x, u.destination!.z)).toBe(true);
  });

  it('keeps retreat and knockback inside the arena', () => {
    const edge = { x: ARENA.maxX - .1, z: 0 };
    const stepped = retreatFromTarget(edge, { x: 0, z: 0 }, 5, 0);
    expect(withinZone(0, stepped.x, stepped.z)).toBe(true);

    const state = game(), unit = deployed(state);
    const boss = enemy(state, unit, { x: 0, z: ARENA.minZ + .5 });
    knockEnemyBack(state, boss, 3);
    expect(withinZone(0, boss.x, boss.z)).toBe(true);
  });
});
