import { describe, expect, it } from 'vitest';
import { combatStep } from '../src/combat.js';
import { enemyRoute, laneCenters } from '../src/battlefield-layout.js';
import { handleCommand } from '../src/commands.js';
import { stepGame } from '../src/simulation.js';
import { deployed, enemy, game, start } from './fixtures.js';

describe('shared-lane RTS gameplay', () => {
  it('uses one spawn lane per participant and converges before the shrine', () => {
    for (let count = 1; count <= 4; count++) {
      expect(laneCenters(count)).toHaveLength(count);
      for (let lane = 0; lane < count; lane++) {
        const route = enemyRoute(count, lane);
        expect(route.at(-1)).toEqual({ x: 0, z: 27 });
        if (count > 1) expect(route.at(-2)).toEqual({ x: 0, z: 5 });
      }
    }
  });

  it('moves a live enemy through waypoints then leaks once', () => {
    const state = game(4), unit = deployed(state);
    const mob = enemy(state, unit, { owner: 'p4', x: 30, z: -34, speed: 20, leak: 3, pathIndex: 1 });
    unit.slot = -1;
    const hp = state.baseHp;
    for (let i = 0; i < 100 && state.enemies[mob.id]; i++) combatStep(state, .05);
    expect(state.enemies[mob.id]).toBeUndefined();
    expect(state.baseHp).toBe(hp - 3);
    combatStep(state, .05); expect(state.baseHp).toBe(hp - 3);
  });

  it('rejects a mixed-owner group without moving any unit', () => {
    const state = game(), own = deployed(state), other = deployed(state, undefined, 0, 'p2');
    const before = { x: own.x, z: own.z };
    const result = handleCommand(state, 'p1', { type: 'order', unitIds: [own.id, other.id], order: 'move', x: 0, z: 0 });
    expect(result.ok).toBe(false); expect(own.destination).toBeNull(); expect({ x: own.x, z: own.z }).toEqual(before);
  });

  it('keeps move, attack-move and hold orders distinct', () => {
    const state = game(), unit = deployed(state);
    const mob = enemy(state, unit, { speed: 0 });
    expect(handleCommand(state, 'p1', { type: 'order', unitIds: [unit.id], order: 'move', x: unit.x + 3, z: unit.z }).ok).toBe(true);
    combatStep(state, .05); expect(mob.hp).toBe(mob.maxHp);
    expect(handleCommand(state, 'p1', { type: 'order', unitIds: [unit.id], order: 'attack-move', x: unit.x + 3, z: unit.z }).ok).toBe(true);
    combatStep(state, .05); expect(mob.hp).toBeLessThan(mob.maxHp);
    expect(handleCommand(state, 'p1', { type: 'order', unitIds: [unit.id], order: 'hold' }).ok).toBe(true);
    expect(unit.orderMode).toBe('hold'); expect(unit.destination).toBeNull();
  });

  it('grants equal wave resources while kills grant none', () => {
    const state = game(2); start(state);
    state.remaining = .01; state.phase = 'combat'; state.wave = 1; state.spawned = state.spawnBudget = 0;
    const before = Object.values(state.players).map(player => [player.gold, player.souls]);
    stepGame(state, .05);
    expect(Object.values(state.players).map(player => player.gold - before[0][0])).toEqual([220, 220]);
    expect(Object.values(state.players).map(player => player.souls - before[0][1])).toEqual([4, 4]);
  });
});
