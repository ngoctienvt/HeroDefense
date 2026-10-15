import { DIFFICULTIES, DUNGEONS } from '../../../content/catalog.js';
import type { CommandResult, GameState, Unit } from '../../contracts/src/types.js';
import { event, isDeployed, nextId, slotPosition } from './rules.js';

export function returnUnit(state: GameState, unit: Unit): void {
  unit.zone = 0; unit.target = null; unit.destination = null; unit.stopped = false; unit.orderMode = 'auto'; unit.engageAt = null; unit.guardPosition = null;
  Object.assign(unit, unit.savedPosition ?? slotPosition(state, unit.owner, unit.slot));
}
export function enterDungeon(state: GameState, owner: string, id: number, ids: string[]): CommandResult {
  const dungeon = state.dungeons.find(d => d.id === id), def = DUNGEONS.find(d => d.id === id);
  if (!dungeon || !def || !dungeon.unlocked || dungeon.cleared) return { ok: false, message: 'Phụ bản chưa mở hoặc đã hoàn thành.' };
  if (!ids.length || ids.length > 5 || new Set(ids).size !== ids.length) return { ok: false, message: 'Chọn từ 1 đến 5 nhân vật.' };
  const units = ids.map(i => state.units[i]);
  if (units.some(u => !u || u.owner !== owner || !isDeployed(u) || u.zone !== 0)) return { ok: false, message: 'Chỉ gửi nhân vật sống trong đội hình của bạn.' };
  if (!dungeon.active) {
    dungeon.active = true; dungeon.owner = owner; dungeon.attempts++; dungeon.remaining = 90;
    const difficulty = DIFFICULTIES.find(d => d.id === state.difficulty)!;
    const hp = Math.round((1200 + def.wave ** 2 * 16) * difficulty.health);
    const enemyId = nextId(state, 'b');
    state.enemies[enemyId] = {
      id: enemyId, owner: 'party', name: def.boss, kind: 'boss', zone: id, x: 0, z: -10,
      hp, maxHp: hp, attack: (32 + def.wave * 4) * difficulty.attack, armor: def.wave * .5,
      speed: 2.4, cooldown: 1, target: null, leak: 0, slow: 0,
    };
    event(state, { kind: 'info', text: `${state.players[owner].name} mở phụ bản ${def.name}. Đồng đội có thể cùng tham gia.` });
  }
  units.forEach((unit, i) => { unit.zone = id; unit.x = (i - 2) * 3; unit.z = 7; unit.target = null; unit.destination = null; unit.stopped = false; unit.orderMode = 'auto'; unit.engageAt = null; unit.guardPosition = { x: unit.x, z: unit.z }; });
  return { ok: true, message: `Đã vào ${def.name}.` };
}
export function dungeonStep(state: GameState, dt: number): void {
  for (const dungeon of state.dungeons) {
    const def = DUNGEONS.find(d => d.id === dungeon.id)!;
    if (state.wave >= def.wave && (!def.supremeOnly || state.difficulty === 'supreme')) dungeon.unlocked = true;
    if (!dungeon.active) continue;
    dungeon.remaining -= dt;
    const boss = Object.values(state.enemies).find(e => e.zone === dungeon.id);
    if (!boss) {
      dungeon.cleared = true; dungeon.active = false;
      for (const player of Object.values(state.players)) { player.gold += 350 + dungeon.id * 100; player.souls += 4 + dungeon.id; player.formationPoints++; }
      event(state, { kind: 'reward', text: `Phá ${def.name}: toàn đội nhận Linh Thạch, Đạo Duyên và 1 điểm trận pháp.` });
    } else if (dungeon.remaining <= 0 || !Object.values(state.units).some(u => u.zone === dungeon.id && isDeployed(u))) {
      delete state.enemies[boss.id]; dungeon.active = false;
      event(state, { kind: 'info', text: `${def.name} thất bại. Có thể thử lại.` });
    }
    if (!dungeon.active) for (const unit of Object.values(state.units)) if (unit.zone === dungeon.id) returnUnit(state, unit);
  }
}
