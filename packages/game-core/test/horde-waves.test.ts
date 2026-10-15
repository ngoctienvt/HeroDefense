import { describe, expect, it } from 'vitest';
import { beginWave, stepGame } from '../src/simulation.js';
import { combatStep, hurtEnemy } from '../src/combat.js';
import { crowdMovement } from '../src/crowd-movement.js';
import { enemyRoute } from '../src/battlefield-layout.js';
import { deployed, enemy, game } from './fixtures.js';

describe('first five horde waves', () => {
  it.each([
    [1, 30, 75, { m001: 30 }],
    [2, 40, 75, { m001: 25, m002: 15 }],
    [3, 35, 75, { m003: 10, m001: 15, m002: 10 }],
    [4, 65, 75, { m004: 65 }],
    [5, 51, 90, { m003: 10, m001: 25, b001: 1, m002: 15 }],
  ] as const)('wave %i spawns the authored army in rows', (wave, budget, duration, expected) => {
    const state = game(2);
    state.phase = 'preparation'; state.wave = wave - 1;
    beginWave(state);
    expect(state.spawnBudget).toBe(budget);
    expect(state.remaining).toBe(duration);
    for (let i = 0; i < 100 && state.spawned < budget; i++) stepGame(state, .05);
    expect(state.spawned).toBe(budget);
    for (const owner of Object.keys(state.players)) {
      const counts: Record<string, number> = {};
      for (const enemy of Object.values(state.enemies).filter(enemy => enemy.owner === owner)) {
        counts[enemy.monsterId ?? 'unknown'] = (counts[enemy.monsterId ?? 'unknown'] ?? 0) + 1;
      }
      expect(counts).toEqual(expected);
    }
  });

  it('absorbs damage with the bear shield and emits both boss abilities', () => {
    const state = game(1), unit = deployed(state, 'h001');
    state.phase = 'combat'; state.wave = 5;
    const boss = { id: 'boss', owner: 'p1', name: 'Hắc Phong Hùng Vương', monsterId: 'b001' as const,
      kind: 'boss' as const, zone: 0, x: unit.x + 2, z: unit.z,
      hp: 12000, maxHp: 12000, attack: 28, armor: 10, speed: 0, cooldown: 999,
      target: null, leak: 10, slow: 0, shield: 0, skillCooldown: .05, quakeCooldown: .05 };
    state.enemies[boss.id] = boss;
    const minions = Array.from({ length: 50 }, (_, index) => enemy(state, unit, {
      monsterId: 'm001', x: boss.x + 15 + index * .01, z: boss.z, speed: 0, cooldown: 999,
    }));
    combatStep(state, .05);
    expect(boss.shield).toBe(2000);
    expect(boss.skillCooldown).toBe(10);
    expect(boss.quakeCooldown).toBe(12);
    expect(state.events.some(event => event.skillId === 'boss-stone-shield')).toBe(true);
    expect(state.events.some(event => event.skillId === 'boss-earthquake')).toBe(true);
    expect(unit.stun).toBe(1);
    expect(minions.every(minion => minion.armorBuff?.amount === 4 && (minion.armorBuff?.remaining ?? 0) > 4.9)).toBe(true);
    const hp = boss.hp;
    hurtEnemy(state, unit, boss, 100);
    expect(boss.hp).toBe(hp);
    expect(boss.shield).toBeLessThan(2000);
    const reinforcements = Object.values(state.enemies).filter(enemy => enemy.monsterId === 'm001' && !minions.includes(enemy));
    expect(reinforcements).toHaveLength(8);
    const edge = enemyRoute(1, 0)[0];
    expect(reinforcements.every(ally => ally.z >= edge.z && ally.z <= edge.z + 1.3)).toBe(true);
    expect(reinforcements.every(ally => ally.pathIndex === 1)).toBe(true);
  });

  it('waits until the boss enters combat before counting its ability cooldowns', () => {
    const state = game(1), unit = deployed(state, 'h001');
    state.phase = 'combat'; state.wave = 5;
    const boss = enemy(state, unit, { monsterId: 'b001', kind: 'boss',
      x: 0, z: -34, speed: 0, skillCooldown: 10, quakeCooldown: 12, cooldown: 999 });
    combatStep(state, .05);
    expect(boss.skillCooldown).toBe(10);
    expect(boss.quakeCooldown).toBe(12);
    expect(state.events.some(event => event.skillId?.startsWith('boss-'))).toBe(false);
  });

  it('lets the earthquake kill a low-health hero', () => {
    const state = game(1), unit = deployed(state, 'h001');
    state.phase = 'combat'; state.wave = 5; unit.hp = 1;
    enemy(state, unit, { monsterId: 'b001', kind: 'boss', x: unit.x + 2, z: unit.z,
      speed: 0, attack: 0, cooldown: 999, skillCooldown: 10, quakeCooldown: .05 });
    combatStep(state, .05);
    expect(unit.hp).toBe(0);
    expect(unit.respawn).toBeGreaterThan(0);
    expect(state.events.some(event => event.skillId === 'boss-earthquake')).toBe(true);
  });

  it('steers a trailing monster around its ally while advancing', () => {
    const front = { id: 'front', owner: 'p1', name: 'front', kind: 'melee' as const, zone: 0,
      x: 0, z: 0, hp: 10, maxHp: 10, attack: 0, armor: 0, speed: 0, cooldown: 0,
      target: null, leak: 1, slow: 0 };
    const back = { ...front, id: 'back', z: -1.3 };
    const steer = crowdMovement([front, back]);
    const heading = steer(back, { x: 0, z: 10 });
    expect(Math.abs(heading.x)).toBeGreaterThan(0);
    expect(heading.z).toBeGreaterThan(0);
    expect(steer(front, { x: 0, z: 10 }).z).toBeGreaterThan(0);
  });

  it('keeps overlapping monsters moving without a floating-point stall', () => {
    const front = { id: 'front', owner: 'p1', name: 'front', kind: 'melee' as const, zone: 0,
      x: 0, z: 0, hp: 10, maxHp: 10, attack: 0, armor: 0, speed: 0, cooldown: 0,
      target: null, leak: 1, slow: 0 };
    const back = { ...front, id: 'back', z: -1.1000000000000001 };
    const heading = crowdMovement([front, back])(back, { x: 0, z: 10 });
    expect(Number.isFinite(heading.x)).toBe(true);
    expect(heading.z).toBeGreaterThan(0);
  });

  it('turns toward a nearby deployed hero during the first five waves', () => {
    const state = game(1), hero = deployed(state, 'h001');
    state.phase = 'combat'; state.wave = 1;
    const monster = enemy(state, hero, { monsterId: 'm001', speed: 2,
      x: hero.x + 5, z: hero.z - 4, attackRange: 1.5 });
    const startX = monster.x;
    combatStep(state, .05);
    expect(monster.target).toBe(hero.id);
    expect(monster.x).toBeLessThan(startX);
  });

  it('emits the archer attack event used by its arrow visual', () => {
    const state = game(1), hero = deployed(state, 'h001');
    state.phase = 'combat'; state.wave = 2;
    const archer = enemy(state, hero, { monsterId: 'm002', kind: 'ranged',
      x: hero.x + 4, z: hero.z, attackRange: 6, attackInterval: 1.5, attack: 1 });
    combatStep(state, .05);
    expect(state.events.some(event => event.source === archer.id && event.target === hero.id
      && event.skillId === 'monster-attack-m002')).toBe(true);
  });
});
