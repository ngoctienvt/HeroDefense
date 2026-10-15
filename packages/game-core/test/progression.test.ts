import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../../../content/catalog.js';
import { handleCommand, stepGame } from '../src/index.js';
import { command, deployed, enemy, game, rankThree, start } from './fixtures.js';

function fullRoster(state: ReturnType<typeof game>): void {
  // Legal rank/gear maxima, five distinct tier-six heroes. Resources are
  // endowed for a mature-roster progression fixture; waves, enemies, HP, damage,
  // time, victory and rewards are never bypassed or edited during the run.
  const heroes = ['h040', 'h01K', 'h01G', 'h041', 'h01B'];
  for (const owner of Object.keys(state.players)) {
    heroes.forEach((id, slot) => rankThree(state, id, slot, owner));
    state.players[owner].formationPoints = 3;
    command(state, { type: 'formation', formation: 1 }, owner);
    for (let n = 0; n < 3; n++) command(state, { type: 'upgrade-formation', formation: 1 }, owner);
  }
}

describe('authoritative deterministic simulation', () => {
  it('matches identical seeded commands and fixed-step grouping at each speed', () => {
    for (const speed of [1, 2, 4]) {
      const a = game(), b = game();
      deployed(a); deployed(b); start(a); start(b);
      command(a, { type: 'speed', speed }); command(b, { type: 'speed', speed });
      for (let n = 0; n < 100; n++) {
        stepGame(a, .1);
        stepGame(b, .05); stepGame(b, .05);
      }
      expect(b).toEqual(a);
      expect(a.elapsed).toBeCloseTo(10 * speed, 7);
    }
  });
  it('ignores invalid elapsed time, lobby simulation and commands after finish', () => {
    const state = game();
    const lobby = JSON.stringify(state); stepGame(state, .1); expect(JSON.stringify(state)).toBe(lobby);
    start(state); const before = JSON.stringify(state);
    for (const dt of [0, -.1, NaN, Infinity, .501]) stepGame(state, dt);
    expect(JSON.stringify(state)).toBe(before);
    state.phase = 'won'; const finished = JSON.stringify(state);
    expect(handleCommand(state, 'p1', { type: 'summon' }).ok).toBe(false);
    stepGame(state, .5); expect(JSON.stringify(state)).toBe(finished);
  });
});

describe('real complete match progression', () => {
  it.each(DIFFICULTIES)('$id: wins all $waves waves through actual spawning/combat/rewards', (difficulty) => {
    const state = game(4, difficulty.id); fullRoster(state); start(state);
    command(state, { type: 'speed', speed: 4 });
    const seen = new Set<number>(), times: number[] = [];
    let maxEnemies = 0;
    for (let n = 0; n < 10000 && state.phase !== 'won' && state.phase !== 'lost'; n++) {
      const begin = performance.now(); stepGame(state, .5); times.push(performance.now() - begin);
      if (state.wave > 0) seen.add(state.wave);
      maxEnemies = Math.max(maxEnemies, Object.keys(state.enemies).length);
      expect(state.baseHp).toBeGreaterThanOrEqual(0);
      expect(state.events.length).toBeLessThanOrEqual(96);
    }
    times.sort((a, b) => a - b);
    console.info(JSON.stringify({ fixture: 'legal-max-roster', difficulty: difficulty.id, phase: state.phase,
      waves: seen.size, simulatedSeconds: +state.elapsed.toFixed(2), baseHp: state.baseHp,
      kills: Object.values(state.players).reduce((n, p) => n + p.kills, 0), maxEnemies,
      steps: times.length, p50Ms: +times[Math.floor(times.length * .5)].toFixed(3),
      p95Ms: +times[Math.floor(times.length * .95)].toFixed(3), stars: state.stars }));
    expect(state.phase).toBe('won'); expect(state.wave).toBe(difficulty.waves);
    expect([...seen]).toEqual(Array.from({ length: difficulty.waves }, (_, i) => i + 1));
    expect(state.spawned).toBe(state.spawnBudget); expect(state.stars).toBeGreaterThanOrEqual(1);
    expect(Object.values(state.players).every(p => p.kills > 0 && p.formationPoints >= 11)).toBe(true);
  }, 60000);
  it.each(DIFFICULTIES)('$id: undefended real waves lose the shared base and freeze the terminal state', (difficulty) => {
    const state = game(4, difficulty.id); start(state); command(state, { type: 'speed', speed: 4 });
    for (let n = 0; n < 1000 && state.phase !== 'lost'; n++) stepGame(state, .5);
    expect(state.phase).toBe('lost'); expect(state.wave).toBeGreaterThan(0); expect(state.baseHp).toBe(0);
    const before = JSON.stringify(state); stepGame(state, .5); expect(JSON.stringify(state)).toBe(before);
  });
});

describe('four-player combat stress and soak', () => {
  it('steps 20 live defenders against 120 dense long-lived enemies for 30 simulated minutes', () => {
    const state = game(4); fullRoster(state); start(state);
    // Deliberate saturation fixture: valid game entities with long enemy HP and
    // zero attack/speed keep 120 targets resident. Only load fixture stats change;
    // real combat, abilities, RNG, cooldowns and event retention keep executing.
    for (const unit of Object.values(state.units)) {
      for (let i = 0; i < 6; i++) enemy(state, unit, { hp: 1e12, maxHp: 1e12, attack: 0, speed: 0 });
    }
    const samples: number[] = [], begin = performance.now();
    // Use focused combat workload while preparation clock is held by a long
    // preparation duration. This is a load fixture, not a match victory proof.
    state.remaining = 1801;
    for (let n = 0; n < 36000; n++) {
      const tick = performance.now(); stepGame(state, .05); samples.push(performance.now() - tick);
    }
    samples.sort((a, b) => a - b);
    const elapsedMs = performance.now() - begin;
    console.info(JSON.stringify({ fixture: '120-dense-enemy-soak', players: 4, units: Object.keys(state.units).length,
      enemies: Object.keys(state.enemies).length, simulatedSeconds: +state.elapsed.toFixed(2),
      wallMs: +elapsedMs.toFixed(2), steps: samples.length,
      p50Ms: +samples[Math.floor(samples.length * .5)].toFixed(3),
      p95Ms: +samples[Math.floor(samples.length * .95)].toFixed(3), events: state.events.length,
      deaths: Object.values(state.units).reduce((n, u) => n + u.deaths, 0) }));
    expect(Object.keys(state.enemies)).toHaveLength(120);
    expect(Object.keys(state.units)).toHaveLength(20);
    expect(state.elapsed).toBeCloseTo(1800, 6);
    expect(state.events).toHaveLength(96);
    expect(state.baseHp).toBe(100);
    expect(Object.values(state.units).every(u => Number.isFinite(u.hp) && u.hp > 0)).toBe(true);
    // Even zero attack inflicts the game's minimum one damage; this sustained
    // saturation workload must exercise genuine death/respawn and still recover.
    expect(Object.values(state.units).some(u => u.deaths > 0)).toBe(true);
    expect(Object.values(state.players).every(p => p.damage > 0)).toBe(true);
    expect(state.serial).toBeGreaterThan(5000);
  }, 60000);
});
