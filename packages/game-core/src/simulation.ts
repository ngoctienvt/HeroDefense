import { DIFFICULTIES } from '../../../content/catalog.js';
import { enemyRoute } from './battlefield-layout.js';
import type { GameState } from '../../contracts/src/types.js';
import { combatStep } from './combat.js';
import { dungeonStep } from './dungeons.js';
import { event, laneX, nextId, random } from './rules.js';
import { HORDE_WAVES, hordeSpawn, monsterName } from './horde-waves.js';

export function beginWave(state: GameState): void {
  state.wave++; state.phase = 'combat'; state.spawned = 0;
  const horde = HORDE_WAVES[state.wave - 1];
  state.spawnBudget = horde ? horde.spawns.reduce((total, group) => total + group.count, 0)
    : Math.min(30, 6 + Math.floor(state.wave * .6));
  state.spawnTimer = 0;
  state.remaining = horde?.duration ?? (state.wave % 5 === 0 ? 70 : 50);
  state.notice = `Đợt ${state.wave}: ${horde?.name ?? 'bảo vệ Linh Trụ!'}`;
  event(state, { kind: 'wave', text: state.notice });
}
function spawnBatch(state: GameState): void {
  const difficulty = DIFFICULTIES.find(d => d.id === state.difficulty)!;
  const horde = HORDE_WAVES[state.wave - 1];
  if (horde) {
    const players = Object.keys(state.players);
    const end = Math.min(state.spawnBudget, state.spawned + horde.rowSize);
    for (let index = state.spawned; index < end; index++) {
      const spawn = hordeSpawn(horde, index);
      if (!spawn) continue;
      for (const [lane, owner] of players.entries()) {
        const id = nextId(state, 'e');
        const rowColumn = index % horde.rowSize;
        const hp = spawn.hp * difficulty.health;
        state.enemies[id] = {
          id, owner, name: monsterName(spawn.id), monsterId: spawn.id,
          kind: spawn.id === 'b001' ? 'boss' : spawn.id === 'm002' ? 'ranged' : 'melee',
          zone: 0, x: laneX(state, owner) + (spawn.id === 'b001' ? 0 : (rowColumn - 2) * 1.25),
          z: enemyRoute(players.length, lane)[0].z - Math.floor(index / horde.rowSize) * .2,
          hp, maxHp: hp, attack: spawn.attack * difficulty.attack,
          armor: spawn.armor, speed: spawn.speed, cooldown: 0, attackInterval: spawn.interval,
          attackRange: spawn.range, lifestealOnHit: spawn.lifestealOnHit,
          skillCooldown: spawn.id === 'b001' ? 10 : undefined,
          quakeCooldown: spawn.id === 'b001' ? 12 : undefined,
          shield: spawn.id === 'b001' ? 0 : undefined,
          target: null, leak: spawn.leak, slow: 0, pathIndex: 1,
        };
      }
    }
    state.spawned = end;
    return;
  }
  const boss = state.wave % 5 === 0 && state.spawned === state.spawnBudget - 1;
  for (const player of Object.values(state.players)) {
    const id = nextId(state, 'e'), kind = boss ? 'boss' : random(state) < .22 ? 'ranged' : 'melee';
    const hp = (65 + state.wave ** 1.6 * 5.5) * difficulty.health * (boss ? 5 : 1);
    state.enemies[id] = {
      id, owner: player.id, name: boss ? `Ma Tướng · ${state.wave}` : kind === 'ranged' ? 'Yêu Xạ' : 'Ma Binh', kind,
      zone: 0, x: laneX(state, player.id) + (random(state) - .5) * 6, z: enemyRoute(Object.keys(state.players).length, Object.keys(state.players).indexOf(player.id))[0].z,
      hp, maxHp: hp, attack: (8 + state.wave * 2.5) * difficulty.attack * (boss ? 2.5 : 1),
      armor: state.wave * .25, speed: boss ? 1.5 : 1.8 + Math.min(.7, state.wave * .012), cooldown: 0,
      target: null, leak: boss ? 10 : 2, slow: 0, pathIndex: 1,
    };
  }
  state.spawned++;
}
function finishWave(state: GameState): void {
  for (const player of Object.values(state.players)) {
    player.gold += 180 + state.wave * 40; player.souls += 4 + Math.floor(state.wave / 10);
    if (state.wave % 4 === 0) player.formationPoints++;
  }
  if (state.wave >= state.maxWaves) {
    state.phase = 'won';
    state.stars = Math.min(7, 1 + (state.baseHp >= 25 ? 1 : 0) + (state.baseHp >= 60 ? 1 : 0) + (state.baseHp >= 90 ? 1 : 0)
      + Math.min(2, Math.floor(state.dungeons.filter(d => d.cleared).length / 3)) + (state.elapsed < state.maxWaves * 60 ? 1 : 0));
    state.notice = `Thiên Đạo được bảo toàn! Đạt ${state.stars}/7 sao.`;
  } else {
    state.phase = 'preparation'; state.remaining = 25; state.notice = `Qua đợt ${state.wave}. Triệu hồi, hợp nhất và nâng cấp đội hình.`;
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
        spawnBatch(state); state.spawnTimer = HORDE_WAVES[state.wave - 1]?.rowInterval ?? .9;
      }
    }
    combatStep(state, delta); dungeonStep(state, delta);
    if (state.baseHp <= 0) { state.phase = 'lost'; state.notice = 'Linh Trụ đã sụp đổ. Hãy điều chỉnh đội hình và thử lại.'; event(state, { kind: 'info', text: state.notice }); }
    else if (state.phase === 'combat') {
      if (state.remaining <= 0) {
        for (const enemy of Object.values(state.enemies)) if (enemy.zone === 0) { state.baseHp = Math.max(0, state.baseHp - enemy.leak); delete state.enemies[enemy.id]; }
        state.spawned = state.spawnBudget;
        if (state.baseHp <= 0) { state.phase = 'lost'; state.notice = 'Không chặn được đợt tấn công. Linh Trụ đã sụp đổ.'; }
        else finishWave(state);
      } else if (state.spawned >= state.spawnBudget && !Object.values(state.enemies).some(e => e.zone === 0)) finishWave(state);
    }
  }
}
