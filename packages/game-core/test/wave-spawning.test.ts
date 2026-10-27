import { describe, expect, it } from 'vitest';
import { stepGame } from '../src/index.js';
import { beginWave } from '../src/simulation.js';
import { resolveSoftCollisions, resolveUnitCollisions } from '../src/crowd-movement.js';
import { walkEnemyWithPathing, walkUnitWithPathing } from '../src/unit-pathing.js';
import { waveLaneBudget, wavePlanFor } from '../src/wave-plan.js';
import { command, deployed, enemy, game, start } from './fixtures.js';

describe('20-wave spawning and shared bosses', () => {
  it('spawns Wave 1 minions across lanes without overlap', () => {
    const state = game(2);
    start(state);
    command(state, { type: 'next-wave' });
    const plan = wavePlanFor(1);
    expect(state.wave).toBe(1);
    expect(state.spawnBudget).toBe(waveLaneBudget(plan));
    stepGame(state, 0.05);
    const active = Object.values(state.enemies);
    expect(active).toHaveLength(plan.rowSize * 2);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        expect(Math.hypot(active[i].x - active[j].x, active[i].z - active[j].z)).toBeGreaterThan(2.5);
      }
    }
  });

  it('spawns a chieftain at ~40% of a non-boss wave with skill state and hero skin', () => {
    const state = game(1);
    start(state);
    state.wave = 1;
    beginWave(state);
    expect(state.wave).toBe(2);
    for (let tick = 0; tick < 60 && state.spawned < state.spawnBudget; tick++) {
      stepGame(state, 0.2);
    }
    const chieftains = Object.values(state.enemies).filter(e => e.rank === 'chieftain');
    expect(chieftains).toHaveLength(1);
    expect(chieftains[0].skinHeroId).toBe('h001');
    expect(chieftains[0].skills?.[0]?.id).toBe('template-B');
  });

  it('spawns shared solo boss once in the center road on Wave 5 and scales HP by party size', () => {
    const solo = game(1);
    start(solo);
    solo.wave = 4;
    beginWave(solo);
    for (let tick = 0; tick < 80 && solo.spawned < solo.spawnBudget; tick++) {
      stepGame(solo, 0.25);
    }
    const soloBosses = Object.values(solo.enemies).filter(e => e.rank === 'boss');
    expect(soloBosses).toHaveLength(1);
    expect(soloBosses[0].owner).toBe('party');
    expect(soloBosses[0].kit).toBe('hac-phong');
    expect(soloBosses[0].x).toBeCloseTo(0, 0);

    const party = game(4);
    start(party);
    party.wave = 4;
    beginWave(party);
    for (let tick = 0; tick < 80 && party.spawned < party.spawnBudget; tick++) {
      stepGame(party, 0.25);
    }
    const partyBosses = Object.values(party.enemies).filter(e => e.rank === 'boss');
    expect(partyBosses).toHaveLength(1);
    expect(partyBosses[0].owner).toBe('party');
    expect(partyBosses[0].maxHp / soloBosses[0].maxHp).toBeCloseTo(3.25, 2);
  });

  it('spawns twin shared bosses on Wave 10 and Wave 20 linked by linkId', () => {
    for (const targetWave of [10, 20]) {
      const state = game(2);
      start(state);
      state.wave = targetWave - 1;
      beginWave(state);
      for (let tick = 0; tick < 80 && state.spawned < state.spawnBudget; tick++) {
        stepGame(state, 0.25);
      }
      const bosses = Object.values(state.enemies).filter(e => e.rank === 'boss');
      expect(bosses).toHaveLength(2);
      expect(bosses[0].owner).toBe('party');
      expect(bosses[1].owner).toBe('party');
      expect(bosses[0].linkId).toBe(bosses[1].id);
      expect(bosses[1].linkId).toBe(bosses[0].id);
    }
  });

  it('lets heroes and monsters cross blocking bodies and separates settled overlaps', () => {
    const state = game(1), mover = deployed(state, 'h003', 0), blocker = deployed(state, 'h001', 1);
    mover.x = -5; mover.z = 10; blocker.x = 0; blocker.z = 10; blocker.stopped = true;
    walkUnitWithPathing(mover, { x: 5, z: 10 }, 2, [mover, blocker], []);
    expect(mover.z).toBe(10);
    expect(mover.x).toBe(-3);

    const walker = enemy(state, mover, { x: 0, z: -20, monsterId: 'm001' });
    const front = enemy(state, mover, { x: 0, z: -18, monsterId: 'm003', rank: 'elite' });
    walkEnemyWithPathing(walker, { x: 0, z: 0 }, 1.5, [], [walker, front]);
    expect(walker.x).toBe(0);
    expect(walker.z).toBe(-18.5);

    blocker.x = mover.x + 0.1; blocker.z = mover.z;
    resolveUnitCollisions([mover, blocker]);
    expect(Math.hypot(mover.x - blocker.x, mover.z - blocker.z)).toBeGreaterThan(0.1);

    front.x = walker.x + 0.1; front.z = walker.z;
    resolveSoftCollisions([walker, front], [mover]);
    expect(Math.hypot(walker.x - front.x, walker.z - front.z)).toBeGreaterThan(0.1);
  });
});
