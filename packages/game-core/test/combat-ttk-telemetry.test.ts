import { describe, expect, it } from 'vitest';
import { hurtEnemy, hurtUnit } from '../src/combat.js';
import {
  flushWaveTtkSummary,
  latestWaveTtkSummary,
  recordEnemySpawn,
  recordWaveStart,
} from '../src/combat-ttk-telemetry.js';
import { deployed, enemy, game } from './fixtures.js';

describe('combat TTK telemetry', () => {
  it('records per-rank TTK samples, hero deaths, and base HP lost on wave completion', () => {
    const state = game(1);
    const hero = deployed(state, 'h001');
    state.wave = 3;
    state.elapsed = 10;
    recordWaveStart(state);

    const minion = enemy(state, hero, { rank: 'minion', hp: 100, maxHp: 100 });
    const chief = enemy(state, hero, { rank: 'chieftain', hp: 400, maxHp: 400 });
    recordEnemySpawn(state, minion);
    recordEnemySpawn(state, chief);

    state.elapsed = 12.5;
    hurtEnemy(state, hero, minion, 500, 999);
    state.elapsed = 18.0;
    hurtEnemy(state, hero, chief, 1000, 999);
    hurtUnit(state, hero, 999999);

    const summary = flushWaveTtkSummary(state);
    expect(summary).toBeDefined();
    expect(summary?.wave).toBe(3);
    expect(summary?.heroDeaths).toBe(1);
    expect(summary?.byRank.minion.killed).toBe(1);
    expect(summary?.byRank.minion.meanTtkSeconds).toBeCloseTo(2.5, 1);
    expect(summary?.byRank.chieftain.killed).toBe(1);
    expect(summary?.byRank.chieftain.meanTtkSeconds).toBeCloseTo(8.0, 1);
    expect(latestWaveTtkSummary(state)).toEqual(summary);
  });
});
