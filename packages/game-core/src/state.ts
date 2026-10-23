import { CONTENT_VERSION, type CommandResult, type Difficulty, type GameState } from '../../contracts/src/types.js';
import { RUN_WAVES, slotPosition } from './rules.js';

export function createGame(code: string, seed: number, difficulty: Difficulty = 'normal'): GameState {
  return {
    version: CONTENT_VERSION, roomCode: code, host: '', seed: (seed >>> 0) || 1, tick: 0, serial: 0, elapsed: 0,
    phase: 'lobby', difficulty, wave: 0, maxWaves: RUN_WAVES,
    remaining: 0, baseHp: 100, maxBaseHp: 100, speed: 1, players: {}, units: {}, enemies: {},
    events: [], notice: 'Sẵn sàng lập đội bảo vệ Thiên Đạo.', stars: 0, spawned: 0, spawnBudget: 0, spawnTimer: 0,
  };
}
export function addPlayer(state: GameState, id: string, name: string): CommandResult {
  if (state.players[id]) return { ok: false, message: 'Người chơi đã có trong phòng.' };
  if (state.phase !== 'lobby') return { ok: false, message: 'Trận đấu đã bắt đầu.' };
  if (Object.keys(state.players).length >= 4) return { ok: false, message: 'Phòng đã đủ 4 người.' };
  const safeName = name.trim().slice(0, 24);
  if (!safeName) return { ok: false, message: 'Hãy nhập tên.' };
  state.players[id] = {
    id, name: safeName, color: ['#7de2c1', '#f3cf81', '#b5a2fb', '#8bbff5'][Object.keys(state.players).length],
    connected: true, ready: false, gold: 500, souls: 18, pellets: 0, kills: 0, damage: 0,
    summonFailures: { tien: 0, thien: 0 }, pendingChoice: null,
    embryos: { tier3: 0, tier4: 0, tier4Purchased: false },
    formation: 1, formationLevels: Array(8).fill(0), formationPoints: 1, activeSynergies: [],
  };
  if (!state.host) state.host = id;
  return { ok: true };
}
export function removePlayer(state: GameState, id: string): void {
  if (state.phase !== 'lobby') { setPlayerConnected(state, id, false); return; }
  delete state.players[id];
  for (const unit of Object.values(state.units)) if (unit.owner === id) delete state.units[unit.id];
  // Lobby membership determines lanes; move existing squads when an earlier seat leaves.
  for (const unit of Object.values(state.units)) if (unit.slot >= 0) {
    Object.assign(unit, slotPosition(state, unit.owner, unit.slot));
    unit.destination = null; unit.target = null; unit.savedPosition = null; unit.orderMode = 'auto'; unit.engageAt = null; unit.guardPosition = null;
  }
  if (state.host === id) state.host = Object.keys(state.players)[0] ?? '';
}
export function setPlayerConnected(state: GameState, id: string, connected: boolean): void {
  if (state.players[id]) state.players[id].connected = connected;
  if (!state.players[state.host]?.connected) state.host = Object.values(state.players).find(p => p.connected)?.id ?? state.host;
}
