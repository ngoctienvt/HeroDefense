import { describe, expect, it } from 'vitest';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { combatStep, hurtEnemy } from '../src/combat.js';
import { BOSS_KNOCKBACK_SHARE, knockEnemyBack } from '../src/combat-status.js';
import { enemyRadius } from '../src/crowd-movement.js';
import { enemyAttackInterval, enemyWindupSeconds } from '../src/enemy-behavior.js';
import { ringCapacity, ringRadius } from '../src/enemy-engagement.js';
import { nearestRouteSegmentEnd } from '../src/enemy-behavior.js';
import { deployed, enemy, game } from './fixtures.js';

/** One held melee hero (plus an optional second hero two slots over) in a zone-0 combat phase. */
function arena(heroes = 1): { state: GameState; hero: Unit; extra?: Unit } {
  const state = game(1), hero = deployed(state, 'h003');
  const extra = heroes > 1 ? deployed(state, 'h003', 2) : undefined;
  state.phase = 'combat'; state.wave = 1;
  hero.orderMode = 'hold';
  if (extra) extra.orderMode = 'hold';
  return { state, hero, extra };
}

function monster(state: GameState, hero: Unit, overrides: Partial<Enemy>): Enemy {
  return enemy(state, hero, { monsterId: 'm001', attackRange: 1.5, attackInterval: 1.4,
    speed: 1.5, attack: 0, hp: 1e9, maxHp: 1e9, ...overrides });
}

/** Step and return every event emitted on the way (the state keeps only the latest 96). */
function run(state: GameState, seconds: number, each?: () => void): GameState['events'] {
  const seen: GameState['events'] = [];
  let last = state.serial;
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += .05) {
    each?.();
    combatStep(state, .05);
    seen.push(...state.events.filter(entry => entry.id > last));
    last = state.serial;
  }
  return seen;
}

describe('melee surround', () => {
  it('wraps a crowd 360° around one hero and lets every ring slot fight', () => {
    const { state, hero } = arena();
    const crowd = Array.from({ length: 12 }, (_, index) => monster(state, hero, {
      x: hero.x + (index % 4 - 1.5) * 3, z: hero.z - 5 - Math.floor(index / 4) * 3.2 }));
    const events = run(state, 12);
    const capacity = ringCapacity(hero, crowd[0]);
    const ring = crowd.filter(foe => state.enemies[foe.id] && foe.engage?.target === hero.id);
    const swingers = new Set(events.filter(entry => entry.kind === 'attack' && entry.target === hero.id)
      .map(entry => entry.source));
    expect(capacity).toBeGreaterThanOrEqual(5);
    expect(ring.length).toBeLessThanOrEqual(capacity);
    expect(swingers.size).toBeGreaterThanOrEqual(capacity - 1);
    // The ring closes behind the hero instead of stacking rows in front.
    expect(ring.some(foe => foe.z > hero.z + 1)).toBe(true);
    for (let i = 0; i < ring.length; i++) for (let j = i + 1; j < ring.length; j++) {
      const gap = Math.hypot(ring[i].x - ring[j].x, ring[i].z - ring[j].z);
      expect(gap).toBeGreaterThan(enemyRadius(ring[i]) + enemyRadius(ring[j]) - .35);
    }
  });

  it.each([.9, 1.45, 1.5, 2])('walks in from range at speed %f and starts swinging', speed => {
    for (const [dx, dz] of [[0, -6], [6, 0], [-4.2, -4.2]]) {
      const { state, hero } = arena();
      const foe = monster(state, hero, { x: hero.x + dx, z: hero.z + dz, speed, cooldown: 0 });
      const events = run(state, 3 + 6 / speed);
      expect(events.some(entry => entry.kind === 'attack' && entry.source === foe.id)).toBe(true);
    }
  });

  it('keeps the whole ring swinging while a wave-2 pack streams past', () => {
    const { state, hero } = arena();
    const pack = Array.from({ length: 25 }, (_, index) => monster(state, hero, {
      x: hero.x + (index % 5 - 2) * 2.9, z: hero.z - 4 - Math.floor(index / 5) * 2.9 }));
    run(state, 6);
    const events = run(state, 6);
    const swings = new Map<string, number>();
    for (const entry of events) if (entry.kind === 'attack' && entry.target === hero.id && entry.source)
      swings.set(entry.source, (swings.get(entry.source) ?? 0) + 1);
    const steady = [...swings.values()].filter(count => count >= 3).length;
    expect(steady).toBeGreaterThanOrEqual(ringCapacity(hero, pack[0]) - 1);
  });

  it('keeps every other slot when a ring neighbour dies', () => {
    const { state, hero } = arena();
    const crowd = Array.from({ length: 6 }, (_, index) => monster(state, hero, {
      x: hero.x + Math.cos(index) * 4, z: hero.z + Math.sin(index) * 4 }));
    run(state, 4);
    const engaged = crowd.filter(foe => foe.engage?.target === hero.id);
    expect(engaged.length).toBeGreaterThanOrEqual(4);
    const angles = new Map(engaged.map(foe => [foe.id, foe.engage!.angle]));
    delete state.enemies[engaged[0].id];
    run(state, .1);
    for (const foe of engaged.slice(1)) expect(foe.engage?.angle).toBeCloseTo(angles.get(foe.id)!);
  });

  it('sends the overflow to another hero with room, or down the lane when none has room', () => {
    const fill = (state: GameState, hero: Unit): void => {
      const probe = monster(state, hero, { speed: 0 });
      const capacity = ringCapacity(hero, probe), radius = ringRadius(hero, probe);
      for (let n = 0; n < capacity; n++) {
        const foe = n === 0 ? probe : monster(state, hero, { speed: 0 });
        const angle = n * 2 * Math.PI / capacity;
        foe.x = hero.x + Math.cos(angle) * radius; foe.z = hero.z + Math.sin(angle) * radius;
      }
      run(state, .1);
    };
    const { state, hero } = arena();
    fill(state, hero);
    const extra = monster(state, hero, { x: hero.x, z: hero.z - 6.5, speed: 1.5 });
    const path = extra.pathIndex ?? 1;
    run(state, .1);
    expect(extra.engage).toBeUndefined();
    expect(extra.target).toBeNull();
    run(state, 30);
    expect((extra.pathIndex ?? 1) > path || !state.enemies[extra.id]).toBe(true);

    const second = arena(2);
    fill(second.state, second.hero);
    const spill = monster(second.state, second.hero, { x: second.hero.x + 1.5, z: second.hero.z - 6, speed: 1.5 });
    run(second.state, .1);
    expect(spill.engage?.target).toBe(second.extra!.id);
  });
});

describe('after a kill', () => {
  it('resumes from the lane segment beside the enemy', () => {
    const route = [{ x: -10, z: -34 }, { x: -10, z: -22 }, { x: 0, z: 5 }, { x: 0, z: 27 }];
    expect(nearestRouteSegmentEnd(route, { x: -10, z: -30 })).toBe(1);
    expect(nearestRouteSegmentEnd(route, { x: -4, z: -5 })).toBe(2);
    expect(nearestRouteSegmentEnd(route, { x: -3, z: 10 })).toBe(3);
  });


  it('marches on down the lane instead of walking back to a waypoint it passed while chasing', () => {
    const state = game(2), hero = deployed(state, 'h003');
    state.phase = 'combat'; state.wave = 1;
    const foe = monster(state, hero, { x: hero.x, z: hero.z + 1, pathIndex: 2, target: hero.id });
    hero.hp = 0; hero.respawn = 5;
    const z = foe.z;
    run(state, 1);
    expect(foe.z).toBeGreaterThan(z);
  });

  it('looks a little wider for the next hero before leaving', () => {
    const { state, hero, extra } = arena(2);
    const foe = monster(state, hero, { x: hero.x - 3, z: hero.z, target: hero.id });
    extra!.x = foe.x + 11; extra!.z = foe.z;
    hero.hp = 0; hero.respawn = 5;
    run(state, .05);
    expect(foe.engage?.target).toBe(extra!.id);
  });
});

describe('hero auto-acquire', () => {
  it('hits an enemy already in reach instead of chasing a target that drifted away', () => {
    const { state, hero } = arena();
    hero.orderMode = 'auto'; hero.cooldown = 0;
    const far = monster(state, hero, { x: hero.x, z: hero.z - 9, speed: 0 });
    const near = monster(state, hero, { x: hero.x + 2.9, z: hero.z, speed: 0 });
    hero.target = far.id;
    const events = run(state, .05);
    expect(events.some(entry => entry.kind === 'attack' && entry.source === hero.id && entry.target === near.id)).toBe(true);
  });
});

describe('hero leash', () => {
  it('fights the next enemy beside it after a kill instead of walking back to its guard spot', () => {
    const { state, hero } = arena();
    hero.orderMode = 'auto'; hero.cooldown = 0;
    hero.guardPosition = { x: hero.x, z: hero.z + 20 };
    const next = monster(state, hero, { x: hero.x + 2.9, z: hero.z, speed: 0 });
    const z = hero.z;
    const events = run(state, .05);
    expect(events.some(entry => entry.kind === 'attack' && entry.source === hero.id && entry.target === next.id)).toBe(true);
    expect(hero.z).toBeCloseTo(z);
  });
});

describe('enemy swing timing', () => {
  it('winds up first and lands the hit at the damage point', () => {
    const { state, hero } = arena();
    const foe = monster(state, hero, { x: hero.x + 2.9, z: hero.z, attack: 7, speed: 0, cooldown: 0 });
    const hp = hero.hp;
    const first = run(state, .05);
    expect(first.some(entry => entry.kind === 'cast' && entry.skillId === 'monster-windup'
      && entry.source === foe.id && entry.windup === enemyWindupSeconds(foe))).toBe(true);
    expect(first.some(entry => entry.kind === 'attack' && entry.source === foe.id)).toBe(false);
    const rest = run(state, enemyWindupSeconds(foe) + .05);
    expect(rest.some(entry => entry.kind === 'attack' && entry.source === foe.id)).toBe(true);
    expect(hero.hp).toBeLessThan(hp);
  });

  it('cancels a swing when the enemy is stunned during the wind-up', () => {
    const { state, hero } = arena();
    const foe = monster(state, hero, { x: hero.x + 2.9, z: hero.z, attack: 7, speed: 0, cooldown: 0 });
    run(state, .05);
    expect(foe.windup).toBeDefined();
    foe.stun = 1;
    const events = run(state, .5);
    expect(foe.windup).toBeUndefined();
    expect(events.some(entry => entry.kind === 'attack' && entry.source === foe.id)).toBe(false);
  });

  it('keeps its attack rhythm while it is being hit every tick', () => {
    const { state, hero } = arena();
    hero.attack = 0;
    const foe = monster(state, hero, { x: hero.x + 2.9, z: hero.z, attack: 1, speed: 0, cooldown: 0 });
    const events = run(state, 7, () => hurtEnemy(state, hero, foe, 1));
    const hits = events.filter(entry => entry.kind === 'attack' && entry.source === foe.id).length;
    expect(hits).toBeGreaterThanOrEqual(Math.floor(7 / enemyAttackInterval(foe)) - 1);
  });
});

describe('knockback', () => {
  it('pushes away from the attacker and leaves the swing running', () => {
    const { state, hero } = arena();
    const foe = monster(state, hero, { x: hero.x + 2.9, z: hero.z, speed: 0, cooldown: 0 });
    run(state, .05);
    const windup = foe.windup?.remaining;
    knockEnemyBack(state, foe, .6, hero);
    expect(foe.x).toBeCloseTo(hero.x + 3.5);
    expect(foe.z).toBeCloseTo(hero.z);
    expect(foe.windup?.remaining).toBe(windup);
    const events = run(state, enemyWindupSeconds(foe));
    expect(events.some(entry => entry.kind === 'attack' && entry.source === foe.id)).toBe(true);
  });

  it('moves a boss only a quarter of the distance', () => {
    const { state, hero } = arena();
    const boss = enemy(state, hero, { monsterId: 'b001', kind: 'boss', x: hero.x + 4, z: hero.z, speed: 0 });
    knockEnemyBack(state, boss, 2, hero);
    expect(boss.x).toBeCloseTo(hero.x + 4 + 2 * BOSS_KNOCKBACK_SHARE);
  });
});

describe('dense horde budget', () => {
  it('steps 150 engaged enemies within the 50 ms server tick', () => {
    const state = game(1);
    const heroes = [0, 1, 2, 3, 4].map(slot => deployed(state, 'h003', slot));
    state.phase = 'combat'; state.wave = 1;
    for (const unit of heroes) unit.orderMode = 'hold';
    for (let n = 0; n < 150; n++) monster(state, heroes[n % 5], {
      x: -20 + (n % 15) * 2.8, z: -6 - Math.floor(n / 15) * 2.8 });
    const samples: number[] = [];
    for (let tick = 0; tick < 200; tick++) {
      const at = performance.now(); combatStep(state, .05); samples.push(performance.now() - at);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * .95)];
    console.info(JSON.stringify({ fixture: '150-enemy-surround', p50Ms: +samples[100].toFixed(3), p95Ms: +p95.toFixed(3),
      engaged: Object.values(state.enemies).filter(foe => foe.engage).length }));
    expect(p95).toBeLessThan(40);
  });
});
