import { describe, expect, it } from 'vitest';
import { combatStep, hurtEnemy, hurtUnit } from '../src/combat.js';
import { beginWave, stepGame } from '../src/simulation.js';
import { resetWaveCombat } from '../src/wave-reset.js';
import { deployed, enemy, game, summon } from './fixtures.js';

describe('unlimited waves and combat reset', () => {
  it.each([1, 5])('keeps wave %i alive past its former deadline without leaking enemies', wave => {
    const state = game(1), unit = summon(state);
    state.wave = wave - 1;
    beginWave(state);
    state.spawned = state.spawnBudget;
    const foe = enemy(state, unit, { x: 0, z: -30, speed: 0, attack: 0 });
    for (let i = 0; i < 220; i++) stepGame(state, .5);
    expect(state.phase).toBe('combat');
    expect(state.enemies[foe.id]).toBe(foe);
    expect(state.baseHp).toBe(100);
    expect(state.remaining).toBe(0);
  });

  it('does not finish during a gap before the next spawn row', () => {
    const state = game(1);
    beginWave(state);
    state.spawnTimer = 1;
    stepGame(state, .05);
    expect(state.spawned).toBe(0);
    expect(state.phase).toBe('combat');
  });

  it.each(['kill', 'leak', 'mixed'] as const)('finishes after all enemies leave by %s and restores heroes', outcome => {
    const state = game(2), alive = deployed(state), fallen = deployed(state, 'h002', 0, 'p2');
    const reserve = summon(state, 'h003');
    beginWave(state);
    state.spawned = state.spawnBudget;
    state.baseHp = 80;
    alive.hp = 10; reserve.hp = 5;
    alive.abilityCooldown = 10; alive.energy = 80; alive.deaths = 3; alive.waveDeaths = 3;
    alive.haste = { remaining: 20, amount: .5 };
    fallen.hp = 0; fallen.respawn = 12; fallen.waveDeaths = 8;
    fallen.savedPosition = { x: 20, z: 10 };
    const foe = enemy(state, alive, { x: 0, z: 27, speed: 2, pathIndex: 3, leak: 2 });
    if (outcome !== 'leak') hurtEnemy(state, alive, foe, foe.hp * 100);
    if (outcome === 'mixed') enemy(state, alive, { x: 0, z: 27, speed: 2, pathIndex: 3, leak: 3 });
    const gold = state.players.p1.gold;
    stepGame(state, .05);
    expect(state.phase).toBe('preparation');
    expect(state.remaining).toBe(25);
    expect(Object.keys(state.enemies)).toHaveLength(0);
    expect(state.baseHp).toBe(outcome === 'kill' ? 80 : outcome === 'leak' ? 78 : 77);
    for (const unit of [alive, fallen, reserve]) {
      expect(unit.hp).toBe(unit.maxHp);
      expect(unit.respawn).toBe(0);
      expect(unit.waveDeaths).toBe(0);
      expect(unit.abilityCooldown).toBe(0);
      expect(unit.energy).toBe(0);
    }
    expect(alive.haste).toBeUndefined();
    expect(alive.deaths).toBe(3);
    expect({ x: fallen.x, z: fallen.z }).toEqual(fallen.savedPosition);
    expect(state.players.p1.gold).toBe(gold + 220);
    expect(state.combatResetEventId).toBeDefined();
    hurtUnit(state, alive, 1e9);
    expect(alive.respawn).toBe(5);
  });

  it('clears pending skills, projectiles, persistent zones, summons and passive state', () => {
    const state = game(1), unit = deployed(state), clone = summon(state, 'h002');
    clone.summonDuration = 10; clone.summonerId = unit.id;
    Object.assign(unit, {
      pendingAbility: { remaining: 5, zone: 0 }, shadowAssault: { remaining: 4 },
      stun: 10, shield: 500, berserk: { remaining: 10 }, carryFervor: { stacks: 5, remaining: 10 },
      tierImmortal: { remaining: 30, activeRemaining: 5 }, starGuardCooldown: 40,
      phoenixCycle: 40, phoenixEgg: { remaining: 2 }, tierSoulCount: 8, bloodDeathCount: 4,
      cooldown: 2, abilityCooldown: 8, tierGoldShields: [{ remaining: 10, amount: 500 }],
    });
    state.groundEffects = [{ x: 0, z: 0, zone: 0, radius: 3, remaining: 8, damagePerSecond: 20, casterId: unit.id }];
    state.solarPhases = [{ casterId: unit.id, x: 0, z: 0, zone: 0, remaining: 10, attack: 200 }];
    state.boomerangs = [{ id: 1, casterId: unit.id, start: { x: 0, z: 0 }, end: { x: 5, z: 0 },
      zone: 0, remaining: 2, totalDuration: 2, damage: 100, penetration: 0, phase: 'outward', hitIds: [] }];
    state.tierPulses = [{ casterId: unit.id, heroId: unit.heroId, zone: 0, x: 0, z: 0, radius: 3,
      remaining: 5, interval: 1, timer: 0, power: 100, hitCount: {} }];
    resetWaveCombat(state);
    expect(state.units[clone.id]).toBeUndefined();
    expect(state.groundEffects).toEqual([]); expect(state.solarPhases).toEqual([]);
    expect(state.tierPulses).toEqual([]); expect(state.boomerangs).toEqual([]);
    for (const field of ['pendingAbility', 'shadowAssault', 'stun', 'berserk', 'carryFervor',
      'tierImmortal', 'starGuardCooldown', 'phoenixCycle', 'phoenixEgg', 'tierSoulCount',
      'bloodDeathCount', 'tierGoldShields'] as const) expect(unit[field]).toBeUndefined();
    expect(unit.shield).toBe(0); expect(unit.cooldown).toBe(0);
  });

  it('uses 5, 6, 7 seconds per hero, respawns automatically and resets the penalty at wave end', () => {
    const state = game(1), unit = deployed(state), ally = deployed(state, 'h002', 1);
    beginWave(state);
    for (const delay of [5, 6, 7]) {
      hurtUnit(state, unit, 1e9);
      expect(unit.respawn).toBe(delay);
      for (let i = 0; i < delay * 20 - 1; i++) combatStep(state, .05);
      expect(unit.hp).toBe(0);
      combatStep(state, .05);
      expect(unit.respawn).toBe(0); expect(unit.hp).toBe(unit.maxHp);
    }
    hurtUnit(state, ally, 1e9); expect(ally.respawn).toBe(5);
    state.spawned = state.spawnBudget;
    stepGame(state, .05);
    beginWave(state);
    hurtUnit(state, unit, 1e9);
    expect(unit.respawn).toBe(5); expect(unit.deaths).toBe(4);
  });

  it('resets on the final victory but does not restore heroes on base defeat', () => {
    const state = game(1), unit = deployed(state);
    state.wave = state.maxWaves - 1; beginWave(state); state.spawned = state.spawnBudget;
    unit.hp = 1; unit.abilityCooldown = 10;
    stepGame(state, .05);
    expect(state.phase).toBe('won'); expect(unit.hp).toBe(unit.maxHp);
    expect(unit.abilityCooldown).toBe(0);
    const loss = game(1), fallen = deployed(loss);
    beginWave(loss); loss.spawned = loss.spawnBudget; loss.baseHp = 1;
    fallen.hp = 0; fallen.respawn = 10;
    enemy(loss, fallen, { x: 0, z: 27, pathIndex: 3, speed: 2, leak: 2 });
    stepGame(loss, .05);
    expect(loss.phase).toBe('lost'); expect(fallen.hp).toBe(0);
    expect(loss.combatResetEventId).toBeUndefined();
  });
});
