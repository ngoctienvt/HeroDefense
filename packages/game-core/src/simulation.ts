import { DIFFICULTIES } from '../../../content/catalog.js';
import { BOSS_SPAWN, enemyRoute } from './battlefield-layout.js';
import type { Enemy, GameState } from '../../contracts/src/types.js';
import { combatStep } from './combat.js';
import {
  flushWaveTtkSummary,
  recordEnemyLeak,
  recordEnemySpawn,
  recordWaveStart,
} from './combat-ttk-telemetry.js';
import { event, laneX, nextId } from './rules.js';
import {
  resolveEnemySpawn,
  waveLaneBudget,
  wavePlanFor,
  waveSpawnAt,
} from './wave-plan.js';
import { enemyRadius, MONSTER_ROW_SPACING, monsterRadius } from './crowd-movement.js';

function spawnClear(state: GameState, x: number, z: number, radius: number): boolean {
  return Object.values(state.enemies).every(other => other.zone !== 0 || other.hp <= 0
    || Math.hypot(other.x - x, other.z - z) >= radius + enemyRadius(other) + .15);
}

function availableSpawnPoints(state: GameState, players: string[], preferredColumn: number, radius: number) {
  for (let offset = 0; offset < 5; offset++) {
    const column = (preferredColumn + offset) % 5;
    const positions = players.map((owner, lane) => ({
      x: laneX(state, owner) + (column - 2) * MONSTER_ROW_SPACING,
      z: enemyRoute(players.length, lane)[0].z,
    }));
    if (positions.every(position => spawnClear(state, position.x, position.z, radius))) return positions;
  }
  return undefined;
}

function findBossSpawnPoint(state: GameState, preferredX: number, preferredZ: number, radius: number): { x: number; z: number } | undefined {
  for (let row = 0; row < 4; row++) {
    const z = preferredZ - row * (MONSTER_ROW_SPACING + 1.2);
    if (spawnClear(state, preferredX, z, radius)) return { x: preferredX, z };
  }
  return undefined;
}

export function beginWave(state: GameState): void {
  state.wave++;
  state.phase = 'combat';
  state.spawned = 0;
  const plan = wavePlanFor(state.wave);
  state.spawnBudget = waveLaneBudget(plan) + (plan.bosses?.length ? 1 : 0);
  state.spawnTimer = 0;
  state.remaining = plan.duration;
  state.notice = `Đợt ${state.wave}: ${plan.name}`;
  recordWaveStart(state);
  event(state, { kind: 'wave', text: state.notice });
}

function spawnSharedBosses(state: GameState, bossIds: readonly string[], playerCount: number): boolean {
  const difficulty = DIFFICULTIES.find(d => d.id === state.difficulty)!;
  const isTwin = bossIds.length > 1;
  const radius = monsterRadius(undefined, 'boss', 'boss');
  const points: { x: number; z: number }[] = [];
  for (let i = 0; i < bossIds.length; i++) {
    const preferredX = isTwin ? (i === 0 ? -2.8 : 2.8) : BOSS_SPAWN.x;
    const point = findBossSpawnPoint(state, preferredX, BOSS_SPAWN.z, radius);
    if (!point) return false;
    points.push(point);
  }
  const created: Enemy[] = [];
  for (let i = 0; i < bossIds.length; i++) {
    const spec = resolveEnemySpawn(state.wave, bossIds[i], playerCount, isTwin);
    const id = nextId(state, 'e');
    const hp = Math.max(1, Math.round(spec.hp * difficulty.health));
    const enemy: Enemy = {
      id,
      owner: 'party',
      name: spec.name,
      monsterId: spec.monsterId,
      skinHeroId: spec.skinHeroId,
      rank: 'boss',
      kind: 'boss',
      kit: spec.kit,
      skills: spec.skills ? spec.skills.map(s => ({ ...s })) : undefined,
      zone: 0,
      x: points[i].x,
      z: points[i].z,
      hp,
      maxHp: hp,
      attack: Math.max(1, Math.round(spec.attack * difficulty.attack)),
      armor: spec.armor,
      speed: spec.speed,
      cooldown: 0,
      attackInterval: spec.interval,
      attackRange: spec.range,
      lifestealOnHit: spec.lifestealOnHit,
      shield: spec.monsterId === 'b001' ? 0 : undefined,
      target: null,
      leak: spec.leak,
      slow: 0,
      pathIndex: 1,
    };
    state.enemies[id] = enemy;
    recordEnemySpawn(state, enemy);
    created.push(enemy);
  }
  if (created.length === 2) {
    created[0].linkId = created[1].id;
    created[1].linkId = created[0].id;
  }
  return true;
}

function spawnBatch(state: GameState): void {
  const difficulty = DIFFICULTIES.find(d => d.id === state.difficulty)!;
  const plan = wavePlanFor(state.wave);
  const players = Object.keys(state.players);
  const playerCount = Math.max(1, players.length);
  const bossStep = plan.bosses?.length
    ? (plan.bossSpawnIndex ?? Math.floor(waveLaneBudget(plan) * 0.3))
    : -1;
  const end = Math.min(state.spawnBudget, state.spawned + plan.rowSize);
  let index = state.spawned;
  for (; index < end; index++) {
    if (index === bossStep && plan.bosses?.length) {
      if (!spawnSharedBosses(state, plan.bosses, playerCount)) break;
      continue;
    }
    const laneIndex = bossStep >= 0 && index > bossStep ? index - 1 : index;
    const spawn = waveSpawnAt(plan, laneIndex, playerCount);
    if (!spawn) continue;
    const rowColumn = spawn.rank === 'chieftain' ? 2 : laneIndex % plan.rowSize;
    const radius = monsterRadius(spawn.monsterId, spawn.kind, spawn.rank);
    const positions = availableSpawnPoints(state, players, rowColumn, radius);
    if (!positions) break;
    for (const [lane, owner] of players.entries()) {
      const id = nextId(state, 'e');
      const hp = Math.max(1, Math.round(spawn.hp * difficulty.health));
      const enemy: Enemy = {
        id,
        owner,
        name: spawn.name,
        monsterId: spawn.monsterId,
        skinHeroId: spawn.skinHeroId,
        rank: spawn.rank,
        kind: spawn.kind,
        kit: spawn.kit,
        skills: spawn.skills ? spawn.skills.map(s => ({ ...s })) : undefined,
        zone: 0,
        x: positions[lane].x,
        z: positions[lane].z,
        hp,
        maxHp: hp,
        attack: Math.max(1, Math.round(spawn.attack * difficulty.attack)),
        armor: spawn.armor,
        speed: spawn.speed,
        cooldown: 0,
        attackInterval: spawn.interval,
        attackRange: spawn.range,
        lifestealOnHit: spawn.lifestealOnHit,
        target: null,
        leak: spawn.leak,
        slow: 0,
        pathIndex: 1,
      };
      state.enemies[id] = enemy;
      recordEnemySpawn(state, enemy);
    }
  }
  state.spawned = index;
}

function finishWave(state: GameState): void {
  flushWaveTtkSummary(state);
  for (const player of Object.values(state.players)) {
    player.gold += 180 + state.wave * 40;
    player.souls += 4 + Math.floor(state.wave / 10);
    if (state.wave % 4 === 0 || state.wave % 5 === 0) player.formationPoints++;
  }
  if (state.wave >= state.maxWaves) {
    state.phase = 'won';
    state.stars = Math.min(
      7,
      1
        + (state.baseHp >= 25 ? 1 : 0)
        + (state.baseHp >= 50 ? 1 : 0)
        + (state.baseHp >= 75 ? 1 : 0)
        + (state.baseHp >= 90 ? 1 : 0)
        + (state.baseHp === state.maxBaseHp ? 1 : 0)
        + (state.elapsed < state.maxWaves * 65 ? 1 : 0),
    );
    state.notice = `Thiên Đạo được bảo toàn! Đạt ${state.stars}/7 sao.`;
  } else {
    state.phase = 'preparation';
    state.remaining = 25;
    state.notice = `Qua đợt ${state.wave}. Triệu hồi, hợp nhất và nâng cấp đội hình.`;
  }
  event(state, { kind: 'reward', text: state.notice });
}

export function stepGame(state: GameState, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .5 || ['lobby', 'won', 'lost'].includes(state.phase)) return;
  // Keep simulation deterministic and stable even at x4 speed or during a delayed frame.
  let pending = dt * state.speed;
  while (pending > .000001 && state.phase !== 'won' && state.phase !== 'lost') {
    const delta = Math.min(.05, pending); pending -= delta; state.tick++; state.elapsed += delta;
    state.remaining = Math.max(0, state.remaining - delta);
    if (state.phase === 'preparation' && state.remaining <= 0) beginWave(state);
    if (state.phase === 'combat') {
      state.spawnTimer -= delta;
      if (state.spawned < state.spawnBudget && state.spawnTimer <= 0) {
        const plan = wavePlanFor(state.wave);
        spawnBatch(state);
        state.spawnTimer = plan.rowInterval;
      }
    }
    combatStep(state, delta);
    if (state.baseHp <= 0) {
      flushWaveTtkSummary(state);
      state.phase = 'lost';
      state.notice = 'Linh Trụ đã sụp đổ. Hãy điều chỉnh đội hình và thử lại.';
      event(state, { kind: 'info', text: state.notice });
    } else if (state.phase === 'combat') {
      if (state.remaining <= 0) {
        for (const enemy of Object.values(state.enemies)) if (enemy.zone === 0) {
          recordEnemyLeak(state, enemy);
          state.baseHp = Math.max(0, state.baseHp - enemy.leak);
          delete state.enemies[enemy.id];
        }
        state.spawned = state.spawnBudget;
        if (state.baseHp <= 0) {
          flushWaveTtkSummary(state);
          state.phase = 'lost';
          state.notice = 'Không chặn được đợt tấn công. Linh Trụ đã sụp đổ.';
        } else finishWave(state);
      } else if (state.spawned >= state.spawnBudget && !Object.values(state.enemies).some(e => e.zone === 0)) {
        finishWave(state);
      }
    }
  }
}
