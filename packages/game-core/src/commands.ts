import { DIFFICULTIES, FORMATIONS, HERO_BY_ID } from '../../../content/catalog.js';
import type { Command, CommandResult, GameState } from '../../contracts/src/types.js';
import { castAbility } from './combat.js';
import { ARENA, withinArena } from './battlefield-layout.js';
import { enterDungeon, returnUnit } from './dungeons.js';
import { event, slotPosition } from './rules.js';
import { rosterCommand } from './roster.js';
import { beginWave } from './simulation.js';
import { refreshStats } from './stats.js';
import { createUnit } from './unit-factory.js';

const fail = (message: string): CommandResult => ({ ok: false, message });
export function handleCommand(state: GameState, id: string, command: Command): CommandResult {
  const player = state.players[id];
  if (!player || !player.connected) return fail('Phiên chơi không hợp lệ.');
  if (state.phase === 'won' || state.phase === 'lost') return fail('Trận đấu đã kết thúc.');
  if (command.type === 'ready') { player.ready = command.ready; return { ok: true }; }
  if (command.type === 'difficulty') {
    if (state.host !== id || state.phase !== 'lobby') return fail('Chỉ chủ phòng đổi độ khó trong sảnh.');
    const difficulty = DIFFICULTIES.find(d => d.id === command.difficulty);
    if (!difficulty) return fail('Độ khó không hợp lệ.');
    state.difficulty = difficulty.id; state.maxWaves = difficulty.waves; return { ok: true };
  }
  if (command.type === 'start') {
    if (state.host !== id || state.phase !== 'lobby') return fail('Chỉ chủ phòng bắt đầu trận.');
    if (Object.values(state.players).some(p => !p.connected || !p.ready)) return fail('Tất cả người chơi cần sẵn sàng.');
    state.phase = 'preparation'; state.remaining = 35; state.notice = 'Triệu hồi nhân vật và triển khai vào 5 ô. Chủ phòng có thể gọi đợt đầu.'; return { ok: true };
  }
  if (command.type === 'next-wave') {
    if (state.host !== id || state.phase !== 'preparation') return fail('Chỉ chủ phòng gọi đợt trong thời gian chuẩn bị.');
    beginWave(state); return { ok: true };
  }
  if (command.type === 'speed') {
    if (state.host !== id || ![1, 2, 4].includes(command.speed)) return fail('Chỉ chủ phòng đổi tốc độ 1×, 2×, 4×.');
    state.speed = command.speed; return { ok: true };
  }
  if (command.type === 'admin-get-hero') {
    const hero = HERO_BY_ID[command.heroId];
    if (!hero) return fail('Tướng không tồn tại.');
    const rank = command.rank ?? 1;
    if (!Number.isInteger(rank) || rank < 1 || rank > 10) return fail('Cấp sao tướng không hợp lệ (1-10★).');
    const unit = createUnit(state, id, hero.id);
    unit.rank = rank;
    const owned = Object.values(state.units).filter(u => u.owner === id);
    if (command.deploy) {
      const existingDeployed = owned.find(u => u.slot >= 0 && u.heroId === hero.id);
      if (existingDeployed) {
        const slot = existingDeployed.slot;
        existingDeployed.slot = -1;
        unit.slot = slot;
        Object.assign(unit, slotPosition(state, id, slot));
        unit.target = null; unit.destination = null; unit.stopped = false; unit.orderMode = 'auto'; unit.engageAt = null; unit.guardPosition = null;
      } else {
        const freeSlot = [0, 1, 2, 3, 4].find(s => !owned.some(u => u.slot === s));
        if (freeSlot !== undefined) {
          unit.slot = freeSlot;
          Object.assign(unit, slotPosition(state, id, freeSlot));
          unit.target = null; unit.destination = null; unit.stopped = false; unit.orderMode = 'auto'; unit.engageAt = null; unit.guardPosition = null;
        }
      }
    }
    state.units[unit.id] = unit;
    refreshStats(state, id);
    unit.hp = unit.maxHp;
    unit.respawn = 0;
    event(state, { kind: 'info', text: `Admin: Đã nhận ${hero.name} (${rank}★)` });
    const dest = unit.slot >= 0 ? `và xuất trận tại Ô ${unit.slot + 1}` : 'vào bộ sưu tập';
    return { ok: true, message: `[Admin] Nhận thành công ${hero.name} (${rank}★) ${dest}.` };
  }
  if (command.type === 'admin-resources') {
    if (typeof command.gold === 'number' && Number.isFinite(command.gold)) player.gold += Math.max(0, Math.floor(command.gold));
    if (typeof command.souls === 'number' && Number.isFinite(command.souls)) player.souls += Math.max(0, Math.floor(command.souls));
    if (typeof command.pellets === 'number' && Number.isFinite(command.pellets)) player.pellets += Math.max(0, Math.floor(command.pellets));
    if (typeof command.formationPoints === 'number' && Number.isFinite(command.formationPoints)) player.formationPoints += Math.max(0, Math.floor(command.formationPoints));
    refreshStats(state, id);
    event(state, { kind: 'info', text: 'Admin: Đã cộng tài nguyên thử nghiệm.' });
    return { ok: true, message: '[Admin] Đã cộng tài nguyên thử nghiệm.' };
  }
  const roster = rosterCommand(state, id, command);
  if (roster) return roster;
  if (command.type === 'formation' || command.type === 'upgrade-formation') {
    const formation = FORMATIONS.find(f => f.id === command.formation);
    if (!formation) return fail('Trận pháp không hợp lệ.');
    if (command.type === 'formation') player.formation = formation.id;
    else {
      if (player.formationLevels[formation.id - 1] >= (state.wave >= 40 ? 4 : 3)) return fail('Đã đạt cấp tối đa (cấp 4 mở từ đợt 40).');
      if (player.formationPoints < 1) return fail('Thiếu điểm trận pháp: nhận mỗi 4 đợt hoặc thắng phụ bản.');
      player.formationPoints--; player.formationLevels[formation.id - 1]++;
    }
    refreshStats(state, id); return { ok: true };
  }
  if (command.type === 'dungeon') {
    if (state.phase === 'lobby') return fail('Trận đấu chưa bắt đầu.');
    return enterDungeon(state, id, command.dungeonId, command.unitIds);
  }
  if (command.type === 'order') {
    const ids = command.unitIds;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5 || new Set(ids).size !== ids.length) return fail('Nhóm quân không hợp lệ.');
    const units = ids.map(unitId => state.units[unitId]);
    if (units.some(unit => !unit || unit.owner !== id)) return fail('Không thể điều khiển nhân vật của người khác.');
    if (units.some(unit => unit.slot < 0 || unit.hp <= 0 || unit.respawn > 0)) return fail('Nhân vật chưa ra trận hoặc đang hồi sinh.');
    if (units.some(unit => unit.zone !== units[0].zone)) return fail('Nhóm quân phải ở cùng chiến trường.');
    const moving = command.order === 'move' || command.order === 'attack-move';
    if (moving && (typeof command.x !== 'number' || typeof command.z !== 'number' || !withinArena(command.x, command.z))) return fail('Vị trí ngoài đấu trường.');
    const target = command.order === 'attack' ? state.enemies[command.target ?? ''] : undefined;
    if (command.order === 'attack' && (!target || target.zone !== units[0].zone)) return fail('Mục tiêu không hợp lệ.');
    if (!['move', 'attack-move', 'attack', 'stop', 'hold'].includes(command.order)) return fail('Lệnh không hợp lệ.');
    units.forEach((unit, index) => {
      unit.target = target?.id ?? null; unit.engageAt = null;
      unit.orderMode = command.order === 'stop' ? 'auto' : command.order;
      unit.stopped = command.order === 'hold';
      if (moving) {
        const offset = (index - (units.length - 1) / 2) * 2;
        unit.destination = { x: Math.max(ARENA.minX, Math.min(ARENA.maxX, command.x! + offset)), z: command.z! };
      } else unit.destination = null;
    });
    return { ok: true };
  }
  if ('unitId' in command) {
    const unit = state.units[command.unitId];
    if (!unit || unit.owner !== id) return fail('Không thể điều khiển nhân vật của người khác.');
    if (command.type === 'save-position') {
      if (unit.zone) return fail('Chỉ lưu vị trí tại đấu trường.');
      unit.savedPosition = command.clear ? null : { x: unit.x, z: unit.z }; return { ok: true };
    }
    if (command.type === 'return') {
      if (!unit.zone) return fail('Nhân vật không ở trong phụ bản.');
      returnUnit(state, unit); return { ok: true };
    }
    if (unit.slot < 0 || unit.hp <= 0) return fail('Nhân vật chưa ra trận hoặc đang hồi sinh.');
    if (command.type === 'move') {
      if (!withinArena(command.x, command.z)) return fail('Vị trí ngoài đấu trường.');
      unit.destination = { x: command.x, z: command.z }; unit.stopped = false; unit.target = null; unit.orderMode = 'move'; return { ok: true };
    }
    if (command.type === 'stop') { unit.stopped = true; unit.target = null; unit.destination = null; unit.orderMode = 'hold'; return { ok: true }; }
    if (command.type === 'attack') {
      const target = state.enemies[command.target];
      if (!target || target.zone !== unit.zone) return fail('Mục tiêu không hợp lệ.');
      unit.target = target.id; unit.destination = null; unit.stopped = false; unit.orderMode = 'attack'; return { ok: true };
    }
    if (command.type === 'cast') return castAbility(state, unit, command.target) ? { ok: true } : fail('Kỹ năng chưa sẵn sàng hoặc không có mục tiêu trong tầm.');
  }
  return fail('Lệnh không hợp lệ.');
}
